import psycopg2
import psycopg2.extras
from datetime import datetime
import os

class Database:
    """Database connection and operations class"""
    
    def __init__(self):
        self.connection = None
        self.cursor = None
    
    def connect(self):
        """Establish database connection"""
        try:
            database_url = os.environ.get('DATABASE_URL')
            if not database_url:
                raise ValueError("DATABASE_URL environment variable not set")
            
            self.connection = psycopg2.connect(database_url)
            self.cursor = self.connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            print("Database connection established successfully")
            return True
        except Exception as e:
            print(f"Error connecting to database: {e}")
            return False
    
    def disconnect(self):
        """Close database connection"""
        if self.cursor:
            self.cursor.close()
        if self.connection:
            self.connection.close()
        print("Database connection closed")
    
    def create_tables(self):
        """Create necessary database tables"""
        try:
            create_table_query = """
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                user_message TEXT NOT NULL,
                ai_response TEXT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """
            self.cursor.execute(create_table_query)
            self.connection.commit()
            print("Tables created successfully")
            return True
        except Exception as e:
            print(f"Error creating tables: {e}")
            return False
    
    def save_message(self, user_message, ai_response):
        """Save a chat message to the database"""
        try:
            insert_query = """
            INSERT INTO messages (user_message, ai_response)
            VALUES (%s, %s)
            RETURNING id, timestamp;
            """
            self.cursor.execute(insert_query, (user_message, ai_response))
            result = self.cursor.fetchone()
            self.connection.commit()
            return result
        except Exception as e:
            print(f"Error saving message: {e}")
            self.connection.rollback()
            return None
    
    def get_recent_messages(self, limit=10):
        """Get recent chat messages from the database"""
        try:
            select_query = """
            SELECT id, user_message, ai_response, timestamp
            FROM messages
            ORDER BY timestamp DESC
            LIMIT %s;
            """
            self.cursor.execute(select_query, (limit,))
            messages = self.cursor.fetchall()
            return messages
        except Exception as e:
            print(f"Error fetching messages: {e}")
            return []
    
    def get_message_count(self):
        """Get total number of messages in the database"""
        try:
            count_query = "SELECT COUNT(*) as count FROM messages;"
            self.cursor.execute(count_query)
            result = self.cursor.fetchone()
            return result['count'] if result else 0
        except Exception as e:
            print(f"Error getting message count: {e}")
            return 0

# Global database instance
db = Database()
