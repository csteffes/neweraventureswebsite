import http.server
import socketserver
import os

PORT = 8000
DIRECTORY = "/Users/cartersteffes/Desktop/new-era-ventures"

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def log_message(self, format, *args):
        print(format % args, flush=True)

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving {DIRECTORY} on port {PORT}", flush=True)
    httpd.serve_forever()
