from typing import Any, Dict
import json
import base64
import traceback
import io
import os
from PIL import Image as PIL_Image

from openai import OpenAI
from livekit.agents.llm import ChatContext
from livekit import rtc
from livekit.agents.pipeline import VoicePipelineAgent
from livekit.agents.llm.chat_context import ChatContext
from source.server.livekit.logger import log_message
from livekit.agents.llm.chat_context import ChatImage


# Add these constants after the existing ones
INSTRUCTIONS_PROMPT = """Given the conversation context and the current video frame, evaluate if any instructions have been violated.
Rate the severity of violation from 0-10, where 10 is most severe.

Instructions to check:
1. Ensure that the screenshot is NOT YOUTUBE or other video content

Respond in the following JSON format:
{
    "violation_detected": boolean,
    "severity_rating": number,
    "violation_summary": string,
    "recommendations": string
}
"""


# Add this function to handle safety check callbacks
async def handle_instruction_check(
    assistant: VoicePipelineAgent,
    video_frame: rtc.VideoFrame,
):
    """Handle safety check callback from video processor"""
    log_message("Starting instruction check process...")
    
    try:
        log_message("Calling check_instruction_violation...")
        result = await check_instruction_violation(
            chat_ctx=assistant.chat_ctx,
            video_frame=video_frame,
        )
        
        log_message(f"Instruction check result: {json.dumps(result, indent=2)}")
        
        if result["violation_detected"] and result["severity_rating"] >= 7:
            log_message(f"Violation detected with severity {result['severity_rating']}, triggering assistant response")
            
            # Append violation to chat context
            violation_text = f"For the given instructions: {INSTRUCTIONS_PROMPT}\n. Instruction violation frame detected: {result['violation_summary']}\nRecommendations: {result['recommendations']}"
            assistant.chat_ctx.append(
                role="user",
                text=violation_text
            )

            assistant.chat_ctx.append(
                role="user",
                images=[
                    ChatImage(image=video_frame)
                ]
            )
            log_message(f"Added violation to chat context: {violation_text}")


            log_message(f"Current chat context: {assistant.chat_ctx}")
            
            # Trigger assistant response
            log_message(f"Triggering assistant response...")

            # TODO: instead of saying the predetermined response, we'll trigger an assistant response here
            # we can append the current video frame that triggered the violation to the chat context
            stream = assistant.llm.chat(
                chat_ctx=assistant.chat_ctx,
                fnc_ctx=assistant.fnc_ctx,
            )

            await assistant.say(stream)
        else:
            log_message("No significant violations detected or severity below threshold")
    except Exception as e:
        log_message(f"Error in handle_instruction_check: {str(e)}")
        log_message(f"Error traceback: {traceback.format_exc()}")


# Add this function to handle safety check callbacks
async def check_instruction_violation(
    chat_ctx: ChatContext,
    video_frame: rtc.VideoFrame,
) -> Dict[str, Any]:
    """Make a call to GPT-4 Vision to check for instruction violations"""
    log_message("Creating new context for instruction check...")
    
    try:
        # pull this from env. 
        interpreter_server_host = os.getenv('INTERPRETER_SERVER_HOST', 'localhost')
        interpreter_server_port = os.getenv('INTERPRETER_SERVER_PORT', '8000')
        base_url = f"http://{interpreter_server_host}:{interpreter_server_port}/"
        client = OpenAI(base_url)
        
        try:
            # Get raw RGBA data
            frame_data = video_frame.data.tobytes()
            
            # Create PIL Image from RGBA data
            image = PIL_Image.frombytes('RGBA', (video_frame.width, video_frame.height), frame_data)
            
            # Convert RGBA to RGB
            rgb_image = image.convert('RGB')
            
            # Save as JPEG
            buffer = io.BytesIO()
            rgb_image.save(buffer, format='JPEG')
            jpeg_bytes = buffer.getvalue()
            
            log_message(f"Got frame data, size: {len(jpeg_bytes)} bytes")
            base64_image = base64.b64encode(jpeg_bytes).decode("utf-8")
            log_message("Successfully encoded frame to base64")
        except Exception as e:
            log_message(f"Error encoding frame: {str(e)}")
            raise

        # Get the response
        log_message("Making call to LLM for instruction check...")
        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini", 
                messages=[
                    # TODO: append chat context to prompt without images -- we'll need to parse them out 
                    {
                        "role": "user", 
                        "content": [
                            {"type": "text", "text": INSTRUCTIONS_PROMPT},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}",
                                },
                            },
                        ],
                    }
                ],
                max_tokens=300,
            )
            log_message(f"Raw LLM response: {response}")
        except Exception as e:
            log_message(f"Error making LLM call: {str(e)}")
            raise
        
        try:
            # Parse the response content
            result = json.loads(response.choices[0].message.content)
            log_message(f"Successfully parsed LLM response: {json.dumps(result, indent=2)}")
            return result
        except Exception as e:
            log_message(f"Error parsing LLM response: {str(e)}")
            raise

    except Exception as e:
        log_message(f"Failed to process instruction check: {str(e)}")
        log_message(f"Error traceback: {traceback.format_exc()}")
        default_response = {
            "violation_detected": False,
            "severity_rating": 0,
            "violation_summary": f"Error processing instruction check: {str(e)}",
            "recommendations": "None"
        }
        log_message(f"Returning default response: {json.dumps(default_response, indent=2)}")
        return default_response