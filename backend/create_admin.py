import getpass
import sys
import bcrypt
from app.database import get_db_connection


def create_admin():
    """
    One-time utility script to create an Administrator account for VenueHub.
    Prompts for admin details, validates input, hashes the password using bcrypt,
    and inserts the record into the users database table with role='admin'.
    """
    print("==========================================")
    print("      VenueHub Admin Creation Utility     ")
    print("==========================================")

    # Prompt user for administrator details
    full_name = input("Enter Admin Full Name: ").strip()
    email = input("Enter Admin Email: ").strip().lower()
    phone = input("Enter Admin Phone (optional): ").strip() or None
    password = getpass.getpass("Enter Admin Password: ")
    confirm_password = getpass.getpass("Confirm Admin Password: ")

    # Basic validations
    if not full_name:
        print("[!] Error: Full name is required.")
        sys.exit(1)

    if not email or '@' not in email:
        print("[!] Error: A valid email address is required.")
        sys.exit(1)

    if not password:
        print("[!] Error: Password cannot be empty.")
        sys.exit(1)

    if password != confirm_password:
        print("[!] Error: Passwords do not match.")
        sys.exit(1)

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # Check if email already exists
            check_sql = "SELECT id FROM users WHERE email = %s"
            cursor.execute(check_sql, (email,))
            existing_user = cursor.fetchone()

            if existing_user:
                print(f"[!] Warning: User with email '{email}' already exists. No changes made.")
                sys.exit(0)

            # Hash the password securely using bcrypt
            salt = bcrypt.gensalt()
            password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

            # Insert admin user into database
            insert_sql = """
                INSERT INTO users (full_name, email, phone, password_hash, role, status)
                VALUES (%s, %s, %s, %s, 'admin', 'active')
            """
            cursor.execute(insert_sql, (full_name, email, phone, password_hash))
            admin_id = cursor.lastrowid

        print("\n==========================================")
        print("[✓] Admin user created successfully!")
        print(f"    Admin ID : {admin_id}")
        print(f"    Email    : {email}")
        print(f"    Role     : admin")
        print(f"    Status   : active")
        print("==========================================")

    except Exception as e:
        print(f"[!] Error creating admin user: {e}")
        sys.exit(1)
    finally:
        if connection:
            connection.close()


if __name__ == '__main__':
    create_admin()
