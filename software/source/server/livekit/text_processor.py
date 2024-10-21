
import re
from livekit.agents.llm import ChatContext, LLMStream, ChatChunk
from livekit import rtc
from livekit.agents.voice_assistant import VoiceAssistant
from dotenv import load_dotenv
from typing import AsyncIterator, Callable
from datetime import datetime

load_dotenv()

# Define the path to the log file
LOG_FILE_PATH = 'text_processor.txt'

def log_message(message: str):
    """Append a message to the log file with a timestamp."""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    with open(LOG_FILE_PATH, 'a') as log_file:
        log_file.write(f"{timestamp} - {message}\n")

class ProcessedLLMStream(LLMStream):
    def __init__(
        self,
        original_stream: LLMStream,
        participant: rtc.LocalParticipant
    ) -> None:
        super().__init__(chat_ctx=original_stream.chat_ctx, fnc_ctx=original_stream.fnc_ctx)
        self.original_stream = original_stream
        # Enhanced regex to handle nested quotes and escaped characters
        self.regex_pattern = r'<unvoiced code="((?:\\.|[^"\\])+)"></unvoiced>'
        self._regex = re.compile(self.regex_pattern)
        self.participant = participant
        self._aiter = self._process_stream()

    async def _process_stream(self) -> AsyncIterator[ChatChunk]:       
        log_message("starting to process stream")
        log_message(f"original stream: {self.original_stream}")
        async for chunk in self.original_stream:     
            log_message("processing chunk")
            log_message(f"Chunk received: {chunk}")
            new_choices = []
            for choice in chunk.choices:
                log_message(f"Choice received: {choice}")
                content = choice.delta.content
                log_message(f"Content received: {content}")
                if content:
                    log_message(f"Incoming content: {content}")
                    
                    matches = self._regex.findall(content)

                    if matches:
                        for match in matches:
                            log_message(f"Matched code block: {match}")
                            # Unescape any escaped characters within the code
                            extracted_code = bytes(match, "utf-8").decode("unicode_escape")
                            log_message(f"Extracted code: {extracted_code}")
                            await self.participant.publish_data(extracted_code, reliable=True, topic="code")
                        
                        # After handling the code block, skip appending this choice
                        log_message("Skipping appending this choice to new_choices.")
                        continue  # Skip to the next choice without appending

                    # Yield the original choice as plain text
                    new_choices.append(choice)
                    log_message(f"Yielding plain text: {content}")

            if new_choices:
                log_message(f"Yielding new choices: {new_choices}")
                yield ChatChunk(choices=new_choices)

    async def __anext__(self) -> ChatChunk:
        try:
            return await self._aiter.__anext__()
        except StopAsyncIteration:
            await self.aclose()
            raise