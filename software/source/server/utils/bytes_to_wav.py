from datetime import datetime
import os
import contextlib
import tempfile
import ffmpeg
import subprocess


def convert_mime_type_to_format(mime_type: str) -> str:
    if mime_type in ["audio/x-wav", "audio/wav"]:
        return "wav"
    if mime_type == "audio/webm":
        return "webm"
    if mime_type == "audio/raw":
        return "dat"
    return mime_type


@contextlib.contextmanager
def export_audio_to_wav_ffmpeg(audio: bytearray, mime_type: str) -> str:
    temp_dir = tempfile.gettempdir()

    # Create a temporary file with the appropriate extension
    input_ext = convert_mime_type_to_format(mime_type)
    input_path = os.path.join(
        temp_dir, f"input_{datetime.now().strftime('%Y%m%d%H%M%S%f')}.{input_ext}"
    )
    with open(input_path, "wb") as f:
        f.write(audio)

    # Check if the input file exists and log its size
    assert os.path.exists(input_path), f"Input file does not exist: {input_path}"
    print(f"Input file size: {os.path.getsize(input_path)} bytes")

    # Export to wav
    output_path = os.path.join(
        temp_dir, f"output_{datetime.now().strftime('%Y%m%d%H%M%S%f')}.wav"
    )

    try:
        # Use ffprobe to get information about the input file
        probe = ffmpeg.probe(input_path)
        print(f"FFprobe result: {probe}")

        if mime_type == "audio/raw":
            ffmpeg.input(
                input_path,
                f="s16le",
                ar="16000",
                ac=1,
            ).output(
                output_path, loglevel="warning"
            ).overwrite_output().run(capture_stdout=True, capture_stderr=True)
        else:
            ffmpeg.input(input_path).output(
                output_path, acodec="pcm_s16le", ac=1, ar="16k", loglevel="warning"
            ).overwrite_output().run(capture_stdout=True, capture_stderr=True)

        print(f"Output file size: {os.path.getsize(output_path)} bytes")
    except ffmpeg.Error as e:
        print(f"FFmpeg stderr:\n{e.stderr.decode()}")
        raise

    try:
        yield output_path
    finally:
        os.remove(input_path)


def bytes_to_wav(audio_bytes: bytearray, mime_type):
    try:
        with export_audio_to_wav_ffmpeg(audio_bytes, mime_type) as wav_file_path:
            return wav_file_path
    except Exception as e:
        print(f"Error in bytes_to_wav: {str(e)}")
        # You might want to return a default WAV file or raise the exception
        raise


"""

from datetime import datetime
import os
import contextlib
import tempfile
import ffmpeg
import subprocess


def convert_mime_type_to_format(mime_type: str) -> str:
    if mime_type == "audio/x-wav" or mime_type == "audio/wav":
        return "wav"
    if mime_type == "audio/webm":
        return "webm"
    if mime_type == "audio/raw":
        return "dat"

    return mime_type


@contextlib.contextmanager
def export_audio_to_wav_ffmpeg(audio: bytearray, mime_type: str) -> str:
    temp_dir = tempfile.gettempdir()

    # Create a temporary file with the appropriate extension
    input_ext = convert_mime_type_to_format(mime_type)
    input_path = os.path.join(
        temp_dir, f"input_{datetime.now().strftime('%Y%m%d%H%M%S%f')}.{input_ext}"
    )
    with open(input_path, "wb") as f:
        f.write(audio)

    # Check if the input file exists
    assert os.path.exists(input_path), f"Input file does not exist: {input_path}"

    # Export to wav
    output_path = os.path.join(
        temp_dir, f"output_{datetime.now().strftime('%Y%m%d%H%M%S%f')}.wav"
    )
    # print(mime_type, input_path, output_path)
    if mime_type == "audio/raw":
        ffmpeg.input(
            input_path,
            f="s16le",
            ar="16000",
            ac=1,
        ).output(output_path, loglevel="panic").run()
    else:
        ffmpeg.input(input_path).output(
            output_path, acodec="pcm_s16le", ac=1, ar="16k", loglevel="panic"
        ).run()

    try:
        yield output_path
    finally:
        os.remove(input_path)


def run_command(command):
    result = subprocess.run(
        command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True
    )
    return result.stdout, result.stderr


def bytes_to_wav(audio_bytes: bytearray, mime_type):
    with export_audio_to_wav_ffmpeg(audio_bytes, mime_type) as wav_file_path:
        return wav_file_path
"""
