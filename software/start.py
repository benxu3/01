import typer
import asyncio
import platform
import threading
import os
import importlib
from source.server.tunnel import create_tunnel
from source.server.async_server import start_server
import subprocess
import segno
from livekit import api
import socket
import json

import signal

app = typer.Typer()


@app.command()
def run(
    server: bool = typer.Option(False, "--server", help="Run server"),
    server_host: str = typer.Option(
        "0.0.0.0",
        "--server-host",
        help="Specify the server host where the server will deploy",
    ),
    server_port: int = typer.Option(
        10001,
        "--server-port",
        help="Specify the server port where the server will deploy",
    ),
    tunnel_service: str = typer.Option(
        "ngrok", "--tunnel-service", help="Specify the tunnel service"
    ),
    expose: bool = typer.Option(False, "--expose", help="Expose server to internet"),
    client: bool = typer.Option(False, "--client", help="Run client"),
    server_url: str = typer.Option(
        None,
        "--server-url",
        help="Specify the server URL that the client should expect. Defaults to server-host and server-port",
    ),
    client_type: str = typer.Option(
        "auto", "--client-type", help="Specify the client type"
    ),
    qr: bool = typer.Option(
        False, "--qr", help="Display QR code to scan to connect to the server"
    ),
    domain: str = typer.Option(
        None, "--domain", help="Connect ngrok to a custom domain"
    ),
    profiles: bool = typer.Option(
        False,
        "--profiles",
        help="Opens the folder where this script is contained",
    ),
    profile: str = typer.Option(
        "default.py",  # default
        "--profile",
        help="Specify the path to the profile, or the name of the file if it's in the `profiles` directory (run `--profiles` to open the profiles directory)",
    ),
    debug: bool = typer.Option(
        False,
        "--debug",
        help="Print latency measurements and save microphone recordings locally for manual playback.",
    ),
    livekit: bool = typer.Option(
        False, "--livekit", help="Creates QR code for livekit server and token."
    ),
):
    _run(
        server=server,
        server_host=server_host,
        server_port=server_port,
        tunnel_service=tunnel_service,
        expose=expose,
        client=client,
        server_url=server_url,
        client_type=client_type,
        qr=qr,
        debug=debug,
        domain=domain,
        profiles=profiles,
        profile=profile,
        livekit=livekit,
    )


def _run(
    server: bool = False,
    server_host: str = "0.0.0.0",
    server_port: int = 10001,
    tunnel_service: str = "bore",
    expose: bool = False,
    client: bool = False,
    server_url: str = None,
    client_type: str = "auto",
    qr: bool = False,
    debug: bool = False,
    domain=None,
    profiles=None,
    profile=None,
    livekit: bool = False,
):

    profiles_dir = os.path.join(
        os.path.dirname(os.path.realpath(__file__)), "source", "server", "profiles"
    )

    if profiles:
        if platform.system() == "Windows":
            subprocess.Popen(["explorer", profiles_dir])
        elif platform.system() == "Darwin":
            subprocess.Popen(["open", profiles_dir])
        elif platform.system() == "Linux":
            subprocess.Popen(["xdg-open", profiles_dir])
        else:
            subprocess.Popen(["open", profiles_dir])
        exit(0)

    if profile:
        if not os.path.isfile(profile):
            profile = os.path.join(profiles_dir, profile)
            if not os.path.isfile(profile):
                profile += ".py"
                if not os.path.isfile(profile):
                    print(f"Invalid profile path: {profile}")
                    exit(1)

    system_type = platform.system()
    if system_type == "Windows":
        server_host = "localhost"

    if not server_url:
        server_url = f"{server_host}:{server_port}"

    if not server and not client and not livekit:
        server = True
        client = True

    def handle_exit(signum, frame):
        os._exit(0)

    signal.signal(signal.SIGINT, handle_exit)

    if server:

        play_audio = False

        # (DISABLED)
        # Have the server play audio if we're running this on the same device. Needless pops and clicks otherwise!
        # if client:
        #     play_audio = True

        server_thread = threading.Thread(
            target=start_server,
            args=(
                server_host,
                server_port,
                profile,
                debug,
                play_audio,
            ),
        )
        server_thread.start()

    if expose:
        tunnel_thread = threading.Thread(
            target=create_tunnel,
            args=[tunnel_service, server_host, server_port, qr, domain],
        )
        tunnel_thread.start()

    if client:
        if client_type == "auto":
            system_type = platform.system()
            if system_type == "Darwin":  # Mac OS
                client_type = "mac"
            elif system_type == "Windows":  # Windows System
                client_type = "windows"
            elif system_type == "Linux":  # Linux System
                try:
                    with open("/proc/device-tree/model", "r") as m:
                        if "raspberry pi" in m.read().lower():
                            client_type = "rpi"
                        else:
                            client_type = "linux"
                except FileNotFoundError:
                    client_type = "linux"

        module = importlib.import_module(
            f".clients.{client_type}.device", package="source"
        )

        play_audio = True

        # (DISABLED)
        # Have the server play audio if we're running this on the same device. Needless pops and clicks otherwise!
        # if server:
        #     play_audio = False

        client_thread = threading.Thread(
            target=module.main, args=[server_url, debug, play_audio]
        )
        client_thread.start()

    if livekit:

        def run_command(command):
            subprocess.run(command, shell=True, check=True)

        def getToken():
            token = (
                api.AccessToken("devkey", "secret")
                .with_identity("identity")
                .with_name("my name")
                .with_grants(
                    api.VideoGrants(
                        room_join=True,
                        room="my-room",
                    )
                )
            )
            return token.to_jwt()

        # Get local IP address
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip_address = s.getsockname()[0]
        s.close()

        # Create QR code
        url = f"ws://{ip_address}:7880"
        token = getToken()
        content = json.dumps({"server": url, "token": token})
        qr_code = segno.make(content)
        qr_code.terminal(compact=True)

        print(f"Mobile setup complete. Scan the QR code to connect")
        print(f"Server URL: {url}")
        print(f"Token: {token}")

        # Create threads for each command and store handles
        # interpreter_thread = threading.Thread(target=run_command, args=("poetry run interpreter --server",))
        livekit_thread = threading.Thread(
            target=run_command, args=('livekit-server --dev --bind "0.0.0.0"',)
        )
        worker_thread = threading.Thread(
            target=run_command,
            args=(
                f"python {os.path.join(os.path.dirname(__file__), 'source', 'clients', 'livekit', 'worker.py')} start",
            ),
        )

        threads = [
            livekit_thread,
            worker_thread,
        ]  # interpreter_thread

        # Start all threads and set up logging for thread completion
        for thread in threads:
            thread.start()

        def signal_handler(sig, frame):
            print("Termination signal received. Shutting down...")
            for thread in threads:
                if thread.is_alive():
                    # This will only work if the subprocess uses shell=True and the OS is Unix-like
                    subprocess.run(f"pkill -P {os.getpid()}", shell=True)
            os._exit(0)

        # Register the signal handler
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)

        # Wait for all threads to complete
        for thread in threads:
            thread.join()

    try:
        if server:
            server_thread.join()
        if expose:
            tunnel_thread.join()
        if client:
            client_thread.join()
    except KeyboardInterrupt:
        os.kill(os.getpid(), signal.SIGINT)
