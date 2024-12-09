from livekit.rtc import VideoStream
from livekit.agents import JobContext
from datetime import datetime
import os

from livekit.rtc import VideoFrame
import asyncio

# Define the path to the log file
LOG_FILE_PATH = 'video_processor.txt'
DEBUG = os.getenv('DEBUG', 'false').lower() == 'true'

def log_message(message: str):
    """Append a message to the log file with a timestamp."""
    if not DEBUG:
        return
    
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    with open(LOG_FILE_PATH, 'a') as log_file:
        log_file.write(f"{timestamp} - {message}\n")

class RemoteVideoProcessor:
    """Processes video frames from a remote participant's video stream."""

    def __init__(self, video_stream: VideoStream, job_ctx: JobContext):
        self.video_stream = video_stream
        self.job_ctx = job_ctx
        self.current_frame = None  # Store the latest VideoFrame
        self.lock = asyncio.Lock()


    async def process_frames(self):
        log_message("Starting to process remote video frames.")
        async for frame_event in self.video_stream:
            try:
                video_frame = frame_event.frame
                timestamp = frame_event.timestamp_us
                rotation = frame_event.rotation

                # Store the current frame safely
                log_message(f"Received frame: width={video_frame.width}, height={video_frame.height}, type={video_frame.type}")
                async with self.lock:
                    self.current_frame = video_frame

            except Exception as e:
                log_message(f"Error processing frame: {e}")

    async def get_current_frame(self) -> VideoFrame | None:
        """Retrieve the current VideoFrame."""
        log_message("called get current frame")
        async with self.lock:
            log_message("retrieving current frame: " + str(self.current_frame))
            return self.current_frame