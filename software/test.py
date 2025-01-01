import subprocess
import time
import os
import typer
import platform
import webbrowser
import psutil
import ngrok
import segno
import json

from pathlib import Path
from livekit import api
from source.server.livekit.worker import main as worker_main
from source.server.livekit.multimodal import main as multimodal_main

from dotenv import load_dotenv



load_dotenv()
system_type = platform.system()
app = typer.Typer()



ROOM_NAME = "my-room"


def pre_clean_process(port):
    """Find and kill process running on specified port"""
    for proc in psutil.process_iter(['pid', 'name', 'connections']):
        try:
            for conn in proc.connections():
                if conn.laddr.port == port:
                    print(f"Killing process {proc.pid} ({proc.name()}) on port {port}")
                    proc.terminate()
                    proc.wait()
                    return True
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass
    return False


def cleanup_processes(processes):
    for process in processes:
        if process.poll() is None:  # if process is still running
            process.terminate()
            process.wait()  # wait for process to terminate

if __name__ == "__main__":
    # preprocess ports
    ports = [10101, 8000, 3000]
    for port in ports:
        pre_clean_process(port)


    profiles_dir = os.path.join(os.path.dirname(os.path.realpath(__file__)), "source", "server", "profiles")

    profile = "default.py"  
    if profile:
        if not os.path.isfile(profile):
            profile = os.path.join(profiles_dir, profile)
            if not os.path.isfile(profile):
                profile += ".py"
                if not os.path.isfile(profile):
                    print(f"Invalid profile path: {profile}")
                    exit(1)


    OI_CMD = f"interpreter --serve --profile {profile}"
    oi_server = subprocess.Popen(OI_CMD, shell=True)
    print("Interpreter server started")
    

    print("Starting livekit server...")
    debug = False
    host = '0.0.0.0'
    port = 10101
    if debug: 
        LK_CMD = f"livekit-server --dev --bind {host} --port {port}"
    else:
        LK_CMD = f"livekit-server --dev --bind {host} --port {port} > /dev/null 2>&1"
    
    lk_server = subprocess.Popen(LK_CMD, shell=True)
    print("Livekit server started")

    lk_url = f"http://localhost:10101"
    participant_token = str(api.AccessToken('devkey', 'secret') \
                .with_identity("Participant") \
                .with_name("You") \
                .with_grants(api.VideoGrants(
                    room_join=True,
                    room=ROOM_NAME,))
                .to_jwt())

    processes = [lk_server, oi_server]

    client = 'meet'    
    if client == 'mobile':
        listener =  ngrok.forward(f"{host}:{port}", authtoken_from_env=True)
        lk_url = listener.url()
        print(f"Livekit server forwarded to: {lk_url}")

        print("Scan the QR code below with your mobile app to connect to the livekit server.")
        content = json.dumps({"livekit_server": lk_url, "token": participant_token})
        qr_code = segno.make(content)
        qr_code.terminal(compact=True)
    else: # meet client
        # Get the path to the meet client directory
        meet_client_path = Path(__file__).parent / "source" / "clients" / "meet"

        print("Starting Next.js dev server...")
        next_server = subprocess.Popen(["pnpm", "dev"], cwd=meet_client_path,)
        print("Next.js dev server started")

        time.sleep(2)
        meet_url = f'http://localhost:3000/custom?liveKitUrl={lk_url.replace("http", "ws")}&token={participant_token}'
        print(f"\nOpening meet interface at: {meet_url}")
        webbrowser.open(meet_url)

        processes.append(next_server)

    multimodal = False
    try:
        print("Starting worker...")
        if multimodal:
            multimodal_main(lk_url)
        else:
            worker_main(lk_url)
        print("Worker started")
    except KeyboardInterrupt:
        print("\nReceived interrupt signal, shutting down...")
    finally:
        print("Cleaning up processes...")
        cleanup_processes(processes)