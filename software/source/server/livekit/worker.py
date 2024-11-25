import asyncio
import numpy as np
import sys
import os
from datetime import datetime
from typing import Literal, Awaitable

from livekit.agents import JobContext, WorkerOptions, cli
from livekit.agents.transcription import STTSegmentsForwarder
from livekit.agents.llm import ChatContext
from livekit import rtc
from livekit.agents.pipeline import VoicePipelineAgent
from livekit.plugins import deepgram, openai, silero, elevenlabs
from livekit.agents.llm.chat_context import ChatContext, ChatImage, ChatMessage
from livekit.agents.llm import LLMStream

from source.server.livekit.video_processor import RemoteVideoProcessor

from source.server.livekit.transcriptions import _forward_transcription

from dotenv import load_dotenv

load_dotenv()

# Define the path to the log file
LOG_FILE_PATH = 'worker.txt'

def log_message(message: str):
    """Append a message to the log file with a timestamp."""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    with open(LOG_FILE_PATH, 'a') as log_file:
        log_file.write(f"{timestamp} - {message}\n")

start_message = """Hi! You can hold the white circle below to speak to me.

Try asking what I can do."""

# This function is the entrypoint for the agent.
async def entrypoint(ctx: JobContext):
    # Create an initial chat context with a system prompt
    initial_chat_ctx = ChatContext().append(
        role="system",
        text=(
            "Only take into context the user's image if their message is relevant or pertaining to the image. Otherwise just keep in context that the image is present but do not acknowledge or mention it in your response." # Open Interpreter handles this.
        ),
    )

    # Connect to the LiveKit room
    await ctx.connect()

    # Create chat manager
    chat = rtc.ChatManager(ctx.room)

    # Initialize RemoteVideoProcessor
    remote_video_processor = None

    ############################################################
    # publish agent image
    ############################################################
    # Create a black background with a white circle
    width, height = 640, 480
    image_np = np.zeros((height, width, 4), dtype=np.uint8)
    
    # Create a white circle
    center = (width // 2, height // 2)
    radius = 50
    y, x = np.ogrid[:height, :width]
    mask = ((x - center[0])**2 + (y - center[1])**2) <= radius**2
    image_np[mask] = [255, 255, 255, 255]  # White color with full opacity

    source = rtc.VideoSource(width, height)
    track = rtc.LocalVideoTrack.create_video_track("static_image", source)
    
    options = rtc.TrackPublishOptions()
    options.source = rtc.TrackSource.SOURCE_CAMERA
    publication = await ctx.room.local_participant.publish_track(track, options)

    # Function to continuously publish the static image
    async def publish_static_image():
        while True:
            frame = rtc.VideoFrame(width, height, rtc.VideoBufferType.RGBA, image_np.tobytes())
            source.capture_frame(frame)
            await asyncio.sleep(1/30)  # Publish at 30 fps

    # Start publishing the static image
    asyncio.create_task(publish_static_image())

    ############################################################
    # initialize voice agent pipeline
    ############################################################
    interpreter_server_host = os.getenv('INTERPRETER_SERVER_HOST', 'localhost')
    interpreter_server_port = os.getenv('INTERPRETER_SERVER_PORT', '8000')
    base_url = f"http://{interpreter_server_host}:{interpreter_server_port}/"

    # For debugging
    base_url = "http://127.0.0.1:8000/"

    open_interpreter = openai.LLM(
        model="open-interpreter", base_url=base_url, api_key="x"
    )

    tts_provider = os.getenv('01_TTS', '').lower()
    stt_provider = os.getenv('01_STT', '').lower()
    tts_provider='elevenlabs'
    stt_provider='deepgram'

    # Add plugins here
    if tts_provider == 'openai':
        tts = openai.TTS()
    elif tts_provider == 'elevenlabs':
        tts = elevenlabs.TTS()
    elif tts_provider == 'cartesia':
        pass # import plugin, TODO support this
    else:
        raise ValueError(f"Unsupported TTS provider: {tts_provider}. Please set 01_TTS environment variable to 'openai' or 'elevenlabs'.")

    if stt_provider == 'deepgram':
        stt = deepgram.STT()
    else:
        raise ValueError(f"Unsupported STT provider: {stt_provider}. Please set 01_STT environment variable to 'deepgram'.")

    ############################################################
    # initialize voice assistant states
    ############################################################
    push_to_talk = True
    accumulated_messages: list[ChatMessage] = []
    submitted_message: list[ChatMessage] = []

    tasks = []
    ############################################################
    # before_llm_cb
    ############################################################
    def _before_llm_cb(
        agent: VoicePipelineAgent, 
        chat_ctx: ChatContext
    ) -> Awaitable[LLMStream] | Literal[False]:
        nonlocal push_to_talk
        nonlocal remote_video_processor
        nonlocal accumulated_messages
        nonlocal submitted_message
        log_message(f"[before_llm_cb] chat_ctx: {chat_ctx}")

        log_message(f"[before_llm_cb] accumulated messages before we check push_to_talk: {accumulated_messages}")
        if push_to_talk:
            last_message = chat_ctx.messages[-1]
            accumulated_messages = [last_message]
            log_message(f"[before_llm_cb] accumulated_messages after setting to last_message: {accumulated_messages}")

            if submitted_message and isinstance(accumulated_messages[0].content, str) and isinstance(submitted_message[0].content, str):
                log_message(f"[before_llm_cb] submitted_message: {submitted_message}")
                # Find where submitted_message ends in accumulated_messages
                submitted_end_idx = 0 
                submitted_message_str = submitted_message[0].content
                accumulated_messages_str = accumulated_messages[0].content

                while submitted_message_str[submitted_end_idx] == accumulated_messages_str[submitted_end_idx]:
                    submitted_end_idx += 1
                    if submitted_end_idx == len(submitted_message_str):
                        break
                
                # Remove the submitted message from the accumulated messages
                log_message(f"[before_llm_cb] submitted_end_idx: {submitted_end_idx}")
                # Take messages after the submitted message
                accumulated_messages = [ChatMessage(role=accumulated_messages[0].role, content=accumulated_messages[0].content[submitted_end_idx:])]
                log_message(f"[before_llm_cb] accumulated_messages after removing submitted_message: {accumulated_messages}")
                
            return False  # Continue without invoking LLM immediately
        
        else: 
            async def process_query():
                if remote_video_processor:
                    video_frame = await remote_video_processor.get_current_frame()
                    if video_frame:
                        chat_ctx.append(role="user", images=[ChatImage(image=video_frame)])
                    else:
                        log_message("[before_llm_cb] No video frame available")
                    
                return agent.llm.chat(
                    chat_ctx=chat_ctx,
                    fnc_ctx=agent.fnc_ctx,
                )

            return process_query()

    ############################################################
    # on_message_received implementation
    ############################################################
    async def _on_message_received(msg: str):
        nonlocal push_to_talk
        nonlocal remote_video_processor
        nonlocal accumulated_messages
        nonlocal submitted_message

        if msg == "{COMPLETE}":
            chat_ctx = assistant.chat_ctx.copy()
            log_message(f"[on_message_received] copied chat_ctx: {chat_ctx}")

            for message in accumulated_messages:
                if isinstance(message.content, str):
                    chat_ctx.append(role=message.role, text=message.content)

                    # extend existing submitted_message content with the new message content 
                    if submitted_message and isinstance(submitted_message[0].content, str):
                        submitted_message[0].content += message.content
                    else:
                        submitted_message = [message]
                    log_message(f"[on_message_received] appended message: {message.content}")
                    log_message(f"[on_message_received] submitted_message is now {submitted_message}")
                    log_message(f"[on_message_received] chat_ctx is now {chat_ctx}")
                elif isinstance(message.content, ChatImage):
                    chat_ctx.append(role=message.role, images=[message.content])
                    log_message(f"[on_message_received] appended message: {message.content}")
                    log_message(f"[on_message_received] submitted_message is now {submitted_message}")
                    log_message(f"[on_message_received] chat_ctx is now {chat_ctx}")
                else:
                    log_message(f"[on_message_received] Unsupported message content type: {message}")
            
            # Reset accumulated messages
            accumulated_messages = []
            log_message(f"[on_message_received] accumulated_messages reset to {accumulated_messages}")

            # Generate a response
            stream = assistant.llm.chat(chat_ctx=chat_ctx)
            await assistant.say(stream)
        
        if msg == "{REQUIRE_START_ON}":
            push_to_talk = True

        if msg == "{REQUIRE_START_OFF}":
            push_to_talk = False

        # why do we copy the chat_ctx here?
        chat_ctx = assistant.chat_ctx.copy()
        chat_ctx.append(role="user", text=msg)
        
        if remote_video_processor:
            video_frame = await remote_video_processor.get_current_frame()
            if video_frame:
                chat_ctx.append(role="user", images=[ChatImage(image=video_frame)]) 

    ############################################################
    # on_message_received callback
    ############################################################
    @chat.on("message_received")
    def on_chat_received(msg: rtc.ChatMessage):
        log_message(f"Chat message received: {msg.message}")
        if msg.message:
            asyncio.create_task(_on_message_received(msg.message))

    ############################################################
    # transcribe participant track 
    ############################################################
    async def transcribe_track(participant: rtc.RemoteParticipant, track: rtc.Track):
        audio_stream = rtc.AudioStream(track)
        stt_forwarder = STTSegmentsForwarder(
            room=ctx.room, participant=participant, track=track
        )
        stt_stream = stt.stream()
        stt_task = asyncio.create_task(
            _forward_transcription(stt_stream, stt_forwarder)
        )
        tasks.append(stt_task)

        async for ev in audio_stream:
            stt_stream.push_frame(ev.frame)

    ############################################################
    # on_track_subscribed callback
    ############################################################
    @ctx.room.on("track_subscribed")
    def on_track_subscribed(
        track: rtc.Track,
        publication: rtc.TrackPublication,
        participant: rtc.RemoteParticipant,
    ):
        log_message(f"Track subscribed: {track.kind}")

        if track.kind == rtc.TrackKind.KIND_AUDIO:
            tasks.append(asyncio.create_task(transcribe_track(participant, track)))

        if track.kind == rtc.TrackKind.KIND_VIDEO:
            nonlocal remote_video_processor

            remote_video_stream = rtc.VideoStream(track=track, format=rtc.VideoBufferType.RGBA)
            remote_video_processor = RemoteVideoProcessor(video_stream=remote_video_stream, job_ctx=ctx)
            log_message("remote video processor." + str(remote_video_processor))
            asyncio.create_task(remote_video_processor.process_frames())

    ############################################################
    # Start the voice assistant with the LiveKit room
    ############################################################
    assistant = VoicePipelineAgent(
        vad=silero.VAD.load(),
        stt=stt,
        llm=open_interpreter,
        tts=tts,
        chat_ctx=initial_chat_ctx,
        before_llm_cb=_before_llm_cb,
    )

    assistant.start(ctx.room)
    await asyncio.sleep(1)

    # Greets the user with an initial message
    await assistant.say(start_message, allow_interruptions=True)


def main(livekit_url: str):
    # Workers have to be run as CLIs right now.
    # So we need to simualte running "[this file] dev"

    # Modify sys.argv to set the path to this file as the first argument
    # and 'dev' as the second argument
    sys.argv = [str(__file__), 'dev']

    # livekit_url = "ws://localhost:7880"
    # Initialize the worker with the entrypoint
    cli.run_app(
        WorkerOptions(entrypoint_fnc=entrypoint, api_key="devkey", api_secret="secret", ws_url=livekit_url)
    )