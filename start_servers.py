import subprocess
import os
import sys
import time
import signal

def start_servers():
    # Get the root directory of the project
    root_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(root_dir, 'backend')
    frontend_dir = os.path.join(root_dir, 'frontend')

    print(f"Root directory: {root_dir}")
    print("Starting Backend Server...")
    
    # Use shell=True for Windows compatibility with npm
    backend_process = subprocess.Popen(
        ['npm', 'run', 'dev'],
        cwd=backend_dir,
        shell=True
    )

    # Give backend a moment to initialize
    time.sleep(2)

    print("Starting Frontend Server...")
    frontend_process = subprocess.Popen(
        ['npm', 'run', 'dev'],
        cwd=frontend_dir,
        shell=True
    )

    print("\nServers are running. Press Ctrl+C to stop.")

    try:
        # Keep the script running to monitor processes
        while True:
            time.sleep(1)
            # Check if processes are still alive
            if backend_process.poll() is not None:
                print("Backend server stopped unexpectedly.")
                break
            if frontend_process.poll() is not None:
                print("Frontend server stopped unexpectedly.")
                break
    except KeyboardInterrupt:
        print("\nStopping servers...")
        # On Windows, terminate() might not kill the shell's child processes (npm -> node).
        # A more robust kill might be needed, but this is a good start.
        backend_process.terminate()
        frontend_process.terminate()
        sys.exit(0)

if __name__ == "__main__":
    start_servers()
