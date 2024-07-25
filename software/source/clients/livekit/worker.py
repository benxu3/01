import asyncio
import logging
import copy
from collections import deque

from livekit import agents, rtc
from livekit.agents import JobContext, JobRequest, WorkerOptions, cli
from livekit.agents.llm import (
    ChatContext,
    ChatMessage,
    ChatRole,
)
from livekit.agents.voice_assistant import VoiceAssistant
from livekit.plugins import deepgram, elevenlabs, openai, silero
from dotenv import load_dotenv
from llm import OpenLLM
from vad import VAD

load_dotenv()


# This function is the entrypoint for the agent.
async def entrypoint(ctx: JobContext):
    # Create an initial chat context with a system prompt
    initial_ctx = ChatContext(
        messages=[
            ChatMessage(
                role=ChatRole.SYSTEM,
                text="""You are a voice assistant created by LiveKit. Your interface with users will be voice.
                Pretend we're having a conversation, no special formatting or headings, just natural speech.""",
            )
        ]
    )

    # VoiceAssistant is a class that creates a full conversational AI agent.
    # See https://github.com/livekit/agents/blob/main/livekit-agents/livekit/agents/voice_assistant/assistant.py
    # for details on how it works.
    open_interpreter = OpenLLM(
        model="open-interpreter", base_url="http://0.0.0.0:8000/v0"
    )
    assistant = VoiceAssistant(
        vad=VAD(),  # Voice Activity Detection
        stt=deepgram.STT(),  # Speech-to-Text
        llm=open_interpreter,  # Language Model
        tts=elevenlabs.TTS(),  # Text-to-Speech
        chat_ctx=initial_ctx,  # Chat history context
    )

    chat = rtc.ChatManager(ctx.room)

    async def _answer_from_text(text: str):
        chat_ctx = copy.deepcopy(assistant.chat_context)
        chat_ctx.messages.append(ChatMessage(role=ChatRole.USER, text=text))

        stream = await open_interpreter.chat(history=chat_ctx)
        await assistant.say(stream)

    @chat.on("message_received")
    def on_chat_received(msg: rtc.ChatMessage):
        print("RECEIVED MESSAGE OMG!!!!!!!!!!")
        print("RECEIVED MESSAGE OMG!!!!!!!!!!")
        print("RECEIVED MESSAGE OMG!!!!!!!!!!")
        print("RECEIVED MESSAGE OMG!!!!!!!!!!")
        if not msg.message:
            return

        asyncio.create_task(_answer_from_text(msg.message))

    # Start the voice assistant with the LiveKit room
    assistant.start(ctx.room)

    await asyncio.sleep(3)

    # Greets the user with an initial message
    await assistant.say("Hey, how can I help you today?", allow_interruptions=True)


# This function is called when the worker receives a job request
# from a LiveKit server.
async def request_fnc(req: JobRequest) -> None:
    logging.info("received request %s", req)
    # Accept the job tells the LiveKit server that this worker
    # wants the job. After the LiveKit server acknowledges that job is accepted,
    # the entrypoint function is called.
    await req.accept(entrypoint)


if __name__ == "__main__":
    # Initialize the worker with the request function
    cli.run_app(WorkerOptions(request_fnc))