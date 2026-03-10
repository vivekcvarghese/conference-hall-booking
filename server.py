import http.server
import socketserver
import json
import os
from urllib.parse import urlparse, parse_qs

PORT = int(os.environ.get('PORT', 8000))
DB_FILE = 'database.json'

# Initial data
INITIAL_SLOTS = [
    { "id": "1", "time": "09:00 AM - 10:00 AM", "status": "available" },
    { "id": "2", "time": "10:00 AM - 11:00 AM", "status": "available" },
    { "id": "3", "time": "11:00 AM - 12:00 PM", "status": "available" },
    { "id": "4", "time": "12:00 PM - 01:00 PM", "status": "available" },
    { "id": "5", "time": "01:00 PM - 02:00 PM", "status": "available" },
    { "id": "6", "time": "02:00 PM - 03:00 PM", "status": "available" },
    { "id": "7", "time": "03:00 PM - 04:00 PM", "status": "available" },
    { "id": "8", "time": "04:00 PM - 05:00 PM", "status": "available" },
    { "id": "9", "time": "05:00 PM - 06:00 PM", "status": "available" }
]

def load_data():
    if not os.path.exists(DB_FILE):
        with open(DB_FILE, 'w') as f:
            json.dump(INITIAL_SLOTS, f, indent=2)
        return INITIAL_SLOTS
    
    with open(DB_FILE, 'r') as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return INITIAL_SLOTS

def save_data(data):
    with open(DB_FILE, 'w') as f:
        json.dump(data, f, indent=2)

class BookingHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urlparse(self.path)
        
        # API Route for getting slots
        if parsed_path.path == '/api/slots':
            slots = load_data()
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(slots).encode('utf-8'))
            return
            
        # Serve static files (index.html, style.css, app.js)
        return super().do_GET()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_POST(self):
        parsed_path = urlparse(self.path)
        
        # API Route for updating a slot
        if parsed_path.path == '/api/slots':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                new_slots = json.loads(post_data.decode('utf-8'))
                save_data(new_slots)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success"}).encode('utf-8'))
            except Exception as e:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
            return

        self.send_error(404, "File not found")

# Create database if it doesn't exist
load_data()

# Start the server
with socketserver.TCPServer(("", PORT), BookingHandler) as httpd:
    print(f"Serving at http://localhost:{PORT}")
    print("Press Ctrl+C to stop the server.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")
