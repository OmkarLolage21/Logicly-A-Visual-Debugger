from flask import Flask, request, jsonify
from flask_cors import CORS
from python_debugger import debug_python
import os
import logging
from datetime import datetime
import traceback

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('debugger_api.log'),
        logging.StreamHandler()
    ]
)

@app.route('/', methods=['GET'])
def index():
    return jsonify({
        'status': 'Visual Debugger API is running',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/debug', methods=['POST'])
def debug_code():
    start_time = datetime.now()
    request_id = os.urandom(4).hex()
    
    data = request.get_json()
    if not data:
        return jsonify({
            'success': False,
            'error': 'No JSON data received',
            'request_id': request_id
        }), 400

    code = data.get('code', '')
    input_data = data.get('input', '')
    language = data.get('language', 'python').lower()

    logging.info(f"[{request_id}] Debug request - Language: {language}")

    if not code.strip():
        return jsonify({
            'success': False,
            'error': 'No code provided',
            'request_id': request_id
        }), 400

    try:
        if language == 'python':
            logging.info(f"[{request_id}] Starting Python debug session")
            debug_states = debug_python(code, input_data)
            logging.info(f"[{request_id}] Debug completed - {len(debug_states)} states")
            
            # Simplified response with just the debug states
            return jsonify({
                'success': True,
                'debugStates': debug_states
            })
            
        elif language == 'javascript':
            return jsonify({
                'success': False,
                'error': 'JavaScript debugging not implemented',
                'request_id': request_id
            }), 501
            
        else:
            return jsonify({
                'success': False,
                'error': f'Unsupported language: {language}',
                'supported_languages': ['python'],
                'request_id': request_id
            }), 400

    except Exception as e:
        logging.error(f"[{request_id}] Error: {str(e)}\n{traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': f"Debugging failed: {str(e)}",
            'traceback': traceback.format_exc() if app.debug else None
        }), 500

@app.after_request
def add_header(response):
    """Add response headers for better cache control"""
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

@app.route('/api/languages', methods=['GET'])
def get_languages():
    """Get supported languages"""
    return jsonify({
        'languages': [
            {
                'id': 'python',
                'name': 'Python',
                'version': '3.x'
            }
        ]
    })

if __name__ == '__main__':
    host = os.getenv('FLASK_HOST', '0.0.0.0')
    port = int(os.getenv('FLASK_PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'
    
    logging.info(f"Starting API on {host}:{port}")
    app.run(host=host, port=port, debug=True)