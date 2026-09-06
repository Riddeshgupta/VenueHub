import getpass
import sys
import bcrypt
from app.database import get_db_connection


def reset_user_password():
    """
    Utility script to reset the password for an existing VenueHub user account.
    Prompts for the user's email and new password, verifies user existence,
    hashes the new password using bcrypt, and updates the database record.
    """
    print("==========================================")
    print("    VenueHub Password Reset Utility       ")
    print("==========================================")

    # Prompt for email
    email = input("Enter User Email: ").strip().lower()
    if not email or '@' not in email:
        print("[!] Error: A valid email address is required.")
        sys.exit(1)

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # Check if user exists
            check_sql = "SELECT id, full_name, email, role, status FROM users WHERE email = %s"
            cursor.execute(check_sql, (email,))
            user = cursor.fetchone()

            if not user:
                print(f"[!] Warning: User with email '{email}' was not found. No changes made.")
                sys.exit(0)

            # Prompt for new password
            print(f"\n[*] Found user: {user['full_name']} (Role: {user['role']})")
            password = getpass.getpass("Enter New Password: ")
            confirm_password = getpass.getpass("Confirm New Password: ")

            if not password:
                print("[!] Error: Password cannot be empty.")
                sys.exit(1)

            if password != confirm_password:
                print("[!] Error: Passwords do not match.")
                sys.exit(1)

            # Hash the new password securely using bcrypt
            salt = bcrypt.gensalt()
            password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

            # Update password hash in database using parameterized query
            update_sql = "UPDATE users SET password_hash = %s WHERE id = %s"
            cursor.execute(update_sql, (password_hash, user['id']))

        print("\n==========================================")
        print("[✓] Password reset successfully!")
        print(f"    User ID  : {user['id']}")
        print(f"    Email    : {user['email']}")
        print(f"    Role     : {user['role']}")
        print(f"    Status   : {user['status']}")
        print("==========================================")

    except Exception as e:
        print(f"[!] Error resetting password: {e}")
        sys.exit(1)
    finally:
        if connection:
            connection.close()


if __name__ == '__main__':
    reset_user_password()
