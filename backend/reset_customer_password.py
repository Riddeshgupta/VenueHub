import sys
import os
import bcrypt

# Add backend directory to python path
sys.path.insert(0, os.path.dirname(__file__))

from app.database import get_db_connection

def reset_password(new_password):
    if not new_password or not new_password.strip():
        print("Error: No new password provided.")
        sys.exit(1)

    email = 'testuser@venuehub.com'
    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # 1. Verify user existence
            cursor.execute("SELECT id, full_name, email, role, status FROM users WHERE email = %s", (email,))
            user = cursor.fetchone()

            if not user:
                print(f"Error: User with email '{email}' not found.")
                sys.exit(1)

            # 2. Hash new password using bcrypt
            salt = bcrypt.gensalt()
            password_hash = bcrypt.hashpw(new_password.strip().encode('utf-8'), salt).decode('utf-8')

            # 3. Update ONLY password_hash for this user
            cursor.execute("UPDATE users SET password_hash = %s WHERE email = %s", (password_hash, email))
            connection.commit()

            # 4. Verify password_hash presence without exposing hash value
            cursor.execute("SELECT id, email, (password_hash IS NOT NULL AND CHAR_LENGTH(password_hash) > 0) AS has_hash FROM users WHERE email = %s", (email,))
            verified = cursor.fetchone()

            if verified and verified['has_hash']:
                print(f"Success: Password for '{email}' has been updated.")
            else:
                print(f"Error: Password update verification failed for '{email}'.")

    except Exception as e:
        if connection:
            connection.rollback()
        print("Error resetting password:", str(e))
        sys.exit(1)
    finally:
        if connection:
            connection.close()

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python reset_customer_password.py <new_password>")
        sys.exit(1)
    
    reset_password(sys.argv[1])
