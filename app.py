from flask import Flask, render_template, request, jsonify
import google.generativeai as genai
import os
from config import config
from models import db
import json
from datetime import datetime

def create_app():
    """Application factory pattern"""
    app = Flask(__name__)
    
    # Load configuration
    config_name = os.environ.get('FLASK_ENV', 'development')
    app.config.from_object(config[config_name])
    
    # Initialize Gemini AI
    if app.config['GEMINI_API_KEY']:
        genai.configure(api_key=app.config['GEMINI_API_KEY'])
        # Use a model with higher free tier limits
        app.gemini_model = genai.GenerativeModel('gemini-2.0-flash')
    else:
        print("Warning: GEMINI_API_KEY not found. AI features will not work.")
        app.gemini_model = None
    
    # Initialize database
    def initialize_database():
        """Initialize database connection and create tables"""
        if db.connect():
            db.create_tables()
        else:
            print("Warning: Could not connect to database. Chat history will not be saved.")
    
    # Initialize database on app creation
    initialize_database()
    
    @app.route('/')
    def index():
        """Main chat page"""
        return render_template('index.html')
    
    @app.route('/api/chat', methods=['POST'])
    def chat():
        """Handle chat messages and return AI response"""
        try:
            data = request.get_json()
            user_message = data.get('message', '').strip()
            
            if not user_message:
                return jsonify({'error': 'Message cannot be empty'}), 400
            
            # Get AI response
            if app.gemini_model:
                try:
                    # Create a prompt for the AI
                    prompt = f"""You are a helpful doctor.Please respond to only health related query otherwise say you have no idea do not do anything else:

User: {user_message}

Please keep your response concise and helpful."""
                    
                    response = app.gemini_model.generate_content(prompt)
                    ai_response = response.text
                except Exception as e:
                    print(f"Error generating AI response: {e}")
                    ai_response = "I'm sorry, I'm having trouble processing your request right now. Please try again later."
            else:
                ai_response = "AI service is not available. Please check the API key configuration."
            
            # Save to database
            if db.connection:
                try:
                    db.save_message(user_message, ai_response)
                except Exception as e:
                    print(f"Error saving message to database: {e}")
            
            return jsonify({
                'user_message': user_message,
                'ai_response': ai_response,
                'timestamp': datetime.now().isoformat()
            })
            
        except Exception as e:
            print(f"Error in chat endpoint: {e}")
            return jsonify({'error': 'Internal server error'}), 500
    
    @app.route('/api/history', methods=['GET'])
    def get_chat_history():
        """Get recent chat history"""
        try:
            limit = request.args.get('limit', 10, type=int)
            messages = db.get_recent_messages(limit) if db.connection else []
            
            # Convert to list of dictionaries
            history = []
            for msg in messages:
                history.append({
                    'id': msg['id'],
                    'user_message': msg['user_message'],
                    'ai_response': msg['ai_response'],
                    'timestamp': msg['timestamp'].isoformat()
                })
            
            return jsonify({'messages': history})
            
        except Exception as e:
            print(f"Error getting chat history: {e}")
            return jsonify({'error': 'Internal server error'}), 500
    
    @app.route('/api/health', methods=['GET'])
    def health_check():
        """Health check endpoint"""
        status = {
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'database_connected': db.connection is not None,
            'ai_available': app.gemini_model is not None
        }
        return jsonify(status)
    
    @app.errorhandler(404)
    def not_found(error):
        """Handle 404 errors"""
        return jsonify({'error': 'Endpoint not found'}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        """Handle 500 errors"""
        return jsonify({'error': 'Internal server error'}), 500
    
    return app

# Create app instance for Gunicorn
app = create_app()

if __name__ == '__main__':
    # Get port from environment variable or use default
    port = int(os.environ.get('PORT', 5000))
    
    # Run the application
    app.run(
        host='0.0.0.0',
        port=port,
        debug=app.config['DEBUG']
    )
