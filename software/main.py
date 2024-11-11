from yaspin import yaspin
spinner = yaspin()
spinner.start()

import typer
import ngrok
import platform
import threading
import os
import importlib
from source.server.server import start_server
import subprocess
import webview
import socket
import json
import segno
from livekit import api
import time
from dotenv import load_dotenv
import signal
from source.server.livekit.worker import main as worker_main
from source.server.livekit.multimodal import main as multimodal_main
import warnings
import requests

load_dotenv()

system_type = platform.system()

app = typer.Typer()

@app.command()
def run(
    server: str = typer.Option(
        None,
        "--server",
        help="Run server (accepts `livekit` or `light`)",
    ),
    server_host: str = typer.Option(
        "0.0.0.0",
        "--server-host",
        help="Specify the server host where the server will deploy",
    ),
    server_port: int = typer.Option(
        10101,
        "--server-port",
        help="Specify the server port where the server will deploy",
    ),
    expose: bool = typer.Option(False, "--expose", help="Expose server over the internet"),
    domain: str = typer.Option(None, "--domain", help="Use `--expose` with a custom ngrok domain"),
    client: str = typer.Option(None, "--client", help="Run client of a particular type. Accepts `light-python`, defaults to `light-python`"),
    server_url: str = typer.Option(
        None,
        "--server-url",
        help="Specify the server URL that the --client should expect. Defaults to server-host and server-port",
    ),
    qr: bool = typer.Option(
        False, "--qr", help="Display QR code containing the server connection information (will be ngrok url if `--expose` is used)"
    ),
    profiles: bool = typer.Option(
        False,
        "--profiles",
        help="Opens the folder where profiles are contained",
    ),
    profile: str = typer.Option(
        "default.py",
        "--profile",
        help="Specify the path to the profile, or the name of the file if it's in the `profiles` directory (run `--profiles` to open the profiles directory)",
    ),
    debug: bool = typer.Option(
        False,
        "--debug",
        help="Print latency measurements and save microphone recordings locally for manual playback",
    ),
    multimodal: bool = typer.Option(
        False,
        "--multimodal",
        help="Run the multimodal agent",
    ),
):

    threads = []

    # Handle `01` with no arguments, which should start server + client
    if not server and not client:
        server = "light"
        client = "light-python"

    ### PROFILES

    profiles_dir = os.path.join(os.path.dirname(os.path.realpath(__file__)), "source", "server", "profiles")

    if profiles:
        if platform.system() == "Windows":
            subprocess.Popen(['explorer', profiles_dir])
        elif platform.system() == "Darwin":
            subprocess.Popen(['open', profiles_dir])
        elif platform.system() == "Linux":
            subprocess.Popen(['xdg-open', profiles_dir])
        else:
            subprocess.Popen(['open', profiles_dir])
        exit(0)

    if profile:
        if not os.path.isfile(profile):
            profile = os.path.join(profiles_dir, profile)
            if not os.path.isfile(profile):
                profile += ".py"
                if not os.path.isfile(profile):
                    print(f"Invalid profile path: {profile}")
                    exit(1)

    # Load the profile module from the provided path
    spec = importlib.util.spec_from_file_location("profile", profile)
    profile_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(profile_module)

    # Get the interpreter from the profile
    interpreter = profile_module.interpreter

    ### SERVER

    if system_type == "Windows":
        server_host = "localhost"

    if not server_url:
        server_url = f"{server_host}:{server_port}"

    if server:

        ### LIGHT SERVER (required by livekit)

        if server == "light":
            light_server_port = server_port
            light_server_host = server_host
            voice = True # The light server will support voice
        elif server == "livekit":
            # The light server should run at a different port if we want to run a livekit server
            spinner.stop()
            print(f"Starting light server (required for livekit server) on localhost, on the port before `--server-port` (port {server_port-1}), unless the `AN_OPEN_PORT` env var is set.")
            print(f"The livekit server will be started on port {server_port}.")
            light_server_port = os.getenv('AN_OPEN_PORT', server_port-1)
            light_server_host = "localhost"
            voice = False # The light server will NOT support voice. It will just run Open Interpreter. The Livekit server will handle voice

        server_thread = threading.Thread(
            target=start_server,
            args=(
                light_server_host,
                light_server_port,
                interpreter,
                voice,
                debug
            ),
        )
        spinner.stop()
        print("Starting server...")
        server_thread.start()
        threads.append(server_thread)

        if server == "livekit":

            ### LIVEKIT SERVER
            url = "wss://oi-3vgs3xsr.livekit.cloud"
            """
            def run_command(command):
                subprocess.run(command, shell=True, check=True)

            # Start the livekit server
            if debug:
                command = f'livekit-server --dev --bind "{server_host}" --port {server_port}'
            else:
                command = f'livekit-server --dev --bind "{server_host}" --port {server_port} > /dev/null 2>&1'
            livekit_thread = threading.Thread(
                target=run_command, args=(command,)
            )
            
            livekit_thread.start()
            threads.append(livekit_thread)
            time.sleep(7)

            local_livekit_url = f"http://{server_host}:{server_port}"
            """

        if expose:
            if server == "livekit":
                print("Livekit server will run at:", url)
        """
            ### EXPOSE OVER INTERNET
            listener = ngrok.forward(f"{server_host}:{server_port}", authtoken_from_env=True, domain=domain)
            url = listener.url()

            ### EXPOSE OVER INTERNET
            try:
                # Add debug logging
                print(f"Attempting to establish ngrok tunnel for {server_host}:{server_port}")
                
                # Verify authtoken is set
                if not os.getenv('NGROK_AUTHTOKEN'):
                    raise ValueError("NGROK_AUTHTOKEN environment variable is not set")
                    
                listener = ngrok.forward(
                    f"{server_host}:{server_port}", 
                    authtoken_from_env=True,
                    domain=domain
                )
                url = listener.url()
                print(f"Successfully established ngrok tunnel at: {url}")
            except Exception as e:
                print(f"Failed to establish ngrok tunnel: {str(e)}")
                print("Please ensure:")
                print("1. NGROK_AUTHTOKEN environment variable is set")
                print("2. You have internet connectivity")
                print("3. Port {server_port} is not already in use")
                raise
                
        else:

            ### GET LOCAL URL
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip_address = s.getsockname()[0]
            s.close()
            url = f"http://{ip_address}:{server_port}"

        
        if server == "livekit":
            print("Livekit server will run at:", url)
        """

    ### CLIENT

    if client:
        
        module = importlib.import_module(
            f".clients.{client}.client", package="source"
        )

        client_thread = threading.Thread(target=module.run, args=[server_url, debug])
        spinner.stop()
        print("Starting client...")
        client_thread.start()
        threads.append(client_thread)


    ### WAIT FOR THREADS TO FINISH, HANDLE CTRL-C

    # Signal handler for termination signals
    def signal_handler(sig, frame):
        print("Termination signal received. Shutting down...")
        for thread in threads:
            if thread.is_alive():
                # Kill subprocess associated with thread
                subprocess.run(f"pkill -P {os.getpid()}", shell=True)
        os._exit(0)

    # Register signal handler for SIGINT and SIGTERM
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    try:
        # Verify the server is running
        """
        for _ in range(10):
            try:
                response = requests.get(url)
                status = "OK" if response.status_code == 200 else "Not OK"
                if status == "OK":
                    break
            except requests.RequestException:
                pass
            time.sleep(1)
        else:
            raise Exception(f"Server at {url} failed to respond after 10 attempts")
        """
        
        ### DISPLAY QR CODE
        if qr:
            token = str(api.AccessToken('API6bznW3sgSYJL', '5zvf9OuyrTQi5fZX7Snr9ykkihuUqWfJoWJxA1EyRC7B') \
                .with_identity("You") \
                .with_name("You") \
                .with_grants(api.VideoGrants(
                    room_join=True,
                    room="my-room",
                    
            )).to_jwt())

            print("\n TOKEN TO JOIN THE ROOM IS ", token)

            def display_qr_code():
                time.sleep(10)
                content = json.dumps({
                    "livekit_server": url
                })
                qr_code = segno.make(content)
                qr_code.terminal(compact=True)

            qr_thread = threading.Thread(target=display_qr_code)
            qr_thread.start()
            threads.append(qr_thread)

        ### START LIVEKIT WORKER
        if server == "livekit":
            time.sleep(7)
            # These are needed to communicate with the worker's entrypoint
            os.environ['INTERPRETER_SERVER_HOST'] = light_server_host
            os.environ['INTERPRETER_SERVER_PORT'] = str(light_server_port)
            os.environ['01_TTS'] = interpreter.tts
            os.environ['01_STT'] = interpreter.stt

            """
            meet_url = f'https://meet.livekit.io/custom?liveKitUrl={url.replace("http", "ws")}&token={token}\n\n'
            print("\n")
            print("For debugging, you can join a video call with your assistant. Click the link below, then send a chat message that says {CONTEXT_MODE_OFF}, then begin speaking:")
            print(meet_url)
            """

            for attempt in range(30):
                try:
                    if multimodal:
                        multimodal_main(url)
                    else:
                        worker_main(url)
                except KeyboardInterrupt:
                    print("Exiting.")
                    raise
                except Exception as e:
                    print(f"Error occurred: {e}")
                print("Retrying...")
                time.sleep(1)

        # Wait for all threads to complete
        for thread in threads:
            thread.join()
    except KeyboardInterrupt:
        # On KeyboardInterrupt, send SIGINT to self
        os.kill(os.getpid(), signal.SIGINT)