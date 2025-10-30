#!/usr/bin/env python3
"""
Simple web server launcher with random port
Launches a local web server and opens it in the default browser
"""

import http.server
import socketserver
import webbrowser
import random
import socket
import sys
import os

def find_free_port(start_port=8000, end_port=9000, max_attempts=100):
    """Find a free port in the given range"""
    for _ in range(max_attempts):
        port = random.randint(start_port, end_port)
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('', port))
                return port
        except OSError:
            continue
    raise RuntimeError("Could not find a free port after {} attempts".format(max_attempts))

def start_server(port, directory=None):
    """Start the HTTP server on the given port"""
    if directory:
        os.chdir(directory)
    
    handler = http.server.SimpleHTTPRequestHandler
    
    # Enable CORS if needed
    class CORSRequestHandler(http.server.SimpleHTTPRequestHandler):
        def end_headers(self):
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            super().end_headers()
    
    try:
        with socketserver.TCPServer(("", port), CORSRequestHandler) as httpd:
            print(f"Server starting on http://localhost:{port}")
            print(f"Serving directory: {os.getcwd()}")
            print("Press Ctrl+C to stop the server")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped by user")
        sys.exit(0)
    except OSError as e:
        print(f"Error starting server: {e}")
        sys.exit(1)

def main():
    """Main function"""
    # Get directory from command line or use current directory
    directory = sys.argv[1] if len(sys.argv) > 1 else None
    
    # Find a free random port
    try:
        port = find_free_port()
        print(f"Selected random port: {port}")
    except RuntimeError as e:
        print(f"Error: {e}")
        sys.exit(1)
    
    # Open browser before starting server
    url = f"http://localhost:{port}"
    print(f"Opening browser to {url}")
    webbrowser.open(url)
    
    # Start the server
    start_server(port, directory)

if __name__ == "__main__":
    main()

