import os
import pymysql
import pymysql.cursors
from dotenv import load_dotenv

# Load environment variables from the backend/.env file
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(dotenv_path=env_path)


def get_db_connection():
    """
    Establishes and returns a new connection to the MySQL database.
    Uses environment variables for secure database credentials.
    """
    connection = pymysql.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        port=int(os.getenv('DB_PORT', 3306)),
        user=os.getenv('DB_USER', 'root'),
        password=os.getenv('DB_PASSWORD', ''),
        database=os.getenv('DB_NAME', 'venuehub'),
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True
    )
    return connection
