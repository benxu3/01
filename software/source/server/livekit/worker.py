import asyncio
import copy
import os
from livekit.agents import JobContext, WorkerOptions, cli
from livekit.agents.transcription import STTSegmentsForwarder
from livekit.agents.llm import ChatContext, ChatMessage
from livekit import rtc
from livekit.agents import stt, transcription, tokenize
from livekit.agents.pipeline import VoicePipelineAgent
from livekit.plugins import deepgram, openai, silero, elevenlabs
from dotenv import load_dotenv
import sys
import numpy as np
from livekit.agents.llm.chat_context import ChatContext, ChatImage
from livekit.agents.llm import LLMStream
from source.server.livekit.video_processor import RemoteVideoProcessor
from datetime import datetime
from typing import AsyncIterable

from livekit import api


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


async def _forward_transcription(
    stt_stream: stt.SpeechStream,
    stt_forwarder: transcription.STTSegmentsForwarder,
):
    """Forward the transcription to the client and log the transcript in the console"""
    async for ev in stt_stream:
        stt_forwarder.update(ev)
        if ev.type == stt.SpeechEventType.INTERIM_TRANSCRIPT:
            print(ev.alternatives[0].text, end="")
        elif ev.type == stt.SpeechEventType.FINAL_TRANSCRIPT:
            print("\n")
            print(" -> ", ev.alternatives[0].text)

# This function is the entrypoint for the agent.
async def entrypoint(ctx: JobContext):
    # Create an initial chat context with a system prompt
    initial_ctx = ChatContext().append(
        role="system",
        text=(
            "" # Open Interpreter handles this.
        ),
    )

    # Connect to the LiveKit room
    await ctx.connect()

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
    
    # Initialize RemoteVideoProcessor as None initially
    remote_video_processor = None

    # VoiceAssistant is a class that creates a full conversational AI agent.
    # See https://github.com/livekit/agents/blob/main/livekit-agents/livekit/agents/voice_assistant/assistant.py
    # for details on how it works.

    # interpreter_server_host = os.getenv('INTERPRETER_SERVER_HOST', 'localhost')
    # interpreter_server_port = os.getenv('INTERPRETER_SERVER_PORT', '8000')
    # base_url = f"http://{interpreter_server_host}:{interpreter_server_port}/openai"

    # For debugging
    base_url = "http://127.0.0.1:8000/v1/"

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
    
    def _01_before_tts_cb(
        agent: VoicePipelineAgent,
        text: str | AsyncIterable[str]
    ) -> str | AsyncIterable[str]:
        if isinstance(text, str):
            log_message(f"before_tts_cb received string: {text}")
            return text
            
        async def process_stream():
            code_buffer = ""
            in_code_block = False
            
            async for chunk in text:
                log_message(f"[CHUNK START] Processing chunk: {chunk}")
                
                # Start of code block
                if chunk.strip().startswith("```") and not in_code_block:
                    log_message(f"[CODE BLOCK] Found start of code block")
                    in_code_block = True
                    code_buffer = ""
                    continue
                
                # End of code block    
                elif "```" in chunk and in_code_block:
                    log_message(f"[CODE BLOCK] Found end of code block")
                    if code_buffer:
                        log_message(f"[PUBLISHING] Code buffer: {code_buffer}")
                        await ctx.room.local_participant.publish_data(
                            code_buffer.encode(), 
                            reliable=True,
                            topic="code"
                        )
                    in_code_block = False
                    log_message("[SKIP] Skipping yield for code block chunk")

                    await ctx.room.local_participant.publish_data(
                        "{CLEAR}".encode(),
                        reliable=True,
                        topic="code"
                    )

                    continue
                    
                # If we're in a code block, add to buffer
                if in_code_block:
                    code_buffer += chunk
                    log_message(f"[CODE BUFFER] Added to buffer: {chunk}")
                else:
                    # If we're not in a code block, yield the chunk
                    log_message(f"[YIELD] Yielding non-code chunk: {chunk}")
                    yield chunk
        
        return process_stream()

    async def _01_before_llm_cb(
        agent: VoicePipelineAgent, 
        chat_ctx: ChatContext
    ) -> LLMStream:

        log_message("OK THIS SHIT IS GETTING CALLED")

        if remote_video_processor:
            log_message("OK remote_video_processor is not None -- getting current frame")
            video_frame = await remote_video_processor.get_current_frame()
            log_message("OK got video frame: " + str(video_frame))

            if video_frame:
                chat_ctx.append(role="user", images=[ChatImage(video_frame)])
                log_message("OK appended video frame to chat_ctx")
            
        return agent.llm.chat(
            chat_ctx=chat_ctx,
            fnc_ctx=agent.fnc_ctx,
        )

    assistant = VoicePipelineAgent(
        vad=silero.VAD.load(),  # Voice Activity Detection
        stt=stt,  # Speech-to-Text
        llm=open_interpreter,  # Language Model
        tts=tts,  # Text-to-Speech
        chat_ctx=initial_ctx,  # Chat history context
        before_llm_cb=_01_before_llm_cb,
        before_tts_cb=_01_before_tts_cb,
    )

    chat = rtc.ChatManager(ctx.room)

    async def _answer_from_text(text: str):
        chat_ctx = assistant.chat_ctx.copy()

        if remote_video_processor:
            log_message("OK remote_video_processor is not None -- getting current frame")
            video_frame = await remote_video_processor.get_current_frame()
            log_message("OK got video frame: " + str(video_frame))

            if video_frame:
                chat_ctx.append(role="user", images=[ChatImage(video_frame)])
                log_message("OK appended video frame to chat_ctx")

        chat_ctx.append(role="user", text=text)
        stream = assistant.llm.chat(chat_ctx=chat_ctx)
        await assistant.say(stream)

    @chat.on("message_received")
    def on_chat_received(msg: rtc.ChatMessage):
        if msg.message:
            asyncio.create_task(_answer_from_text(msg.message))

    # Start the voice assistant with the LiveKit room
    assistant.start(ctx.room)

    await asyncio.sleep(1)

    # Greets the user with an initial message
    await assistant.say(start_message,
    allow_interruptions=True)

    tasks = []

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

            remote_video_stream = rtc.VideoStream(track=track)
            remote_video_processor = RemoteVideoProcessor(video_stream=remote_video_stream, job_ctx=ctx)
            log_message("remote video processor." + str(remote_video_processor))
            asyncio.create_task(remote_video_processor.process_frames())


if __name__ == "__main__":
    # Workers have to be run as CLIs right now.
    # So we need to simualte running "[this file] dev"

    # Modify sys.argv to set the path to this file as the first argument
    # and 'dev' as the second argument
    sys.argv = [str(__file__), 'dev']

    token = str(api.AccessToken('devkey', 'secret') \
                .with_identity("You") \
                .with_name("You") \
                .with_grants(api.VideoGrants(
                    room_join=True,
                    room="my-room",
            )).to_jwt())
    
    print(token)

    livekit_url = "ws://localhost:7880"
    # Initialize the worker with the entrypoint
    cli.run_app(
        WorkerOptions(entrypoint_fnc=entrypoint, api_key="devkey", api_secret="secret", ws_url=livekit_url)
    )