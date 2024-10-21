import aiohttp
from typing import Annotated
from livekit.agents import llm

from datetime import datetime

# Define the path to the log file
LOG_FILE_PATH = 'assistant_functions.txt'

def log_message(message: str):
    """Append a message to the log file with a timestamp."""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    with open(LOG_FILE_PATH, 'a') as log_file:
        log_file.write(f"{timestamp} - {message}\n")

# first define a class that inherits from llm.FunctionContext
class AssistantFnc(llm.FunctionContext):
    # the llm.ai_callable decorator marks this function as a tool available to the LLM
    # by default, it'll use the docstring as the function's description
    @llm.ai_callable()
    async def get_weather(
        self,
        # by using the Annotated type, arg description and type are available to the LLM
        location: Annotated[
            str, llm.TypeInfo(description="The location to get the weather for")
        ],
    ) -> str:
        """Called when the user asks about the weather. This function will return the weather for the given location."""
        log_message(f"getting weather for {location}")
        url = f"https://wttr.in/{location}?format=%C+%t"

        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                log_message(f"response: {response}")
                if response.status == 200:
                    weather_data = await response.text()

                    content: str = f"The weather in {location} is {weather_data}."
                    log_message(f"content: {content}")

                    # response from the function call is returned to the LLM
                    # as a tool response. The LLM's response will include this data
                    return content

                else:
                    log_message(f"Failed to get weather data, status code: {response.status}")
                    return f"Failed to get weather data, status code: {response.status}"

