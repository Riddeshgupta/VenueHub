import bcrypt
from flask import Blueprint, request, jsonify
from app.database import get_db_connection
from app.auth_utils import generate_jwt_token

# Create authentication Blueprint
auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
def register():
    """
    User Registration Endpoint
    POST /api/auth/register
    """
    # 1. Parse JSON payload
    data = request.get_json()
    if not data:
        return jsonify({
            "status": "error",
            "message": "Request body must be valid JSON"
        }), 400

    full_name = data.get('full_name', '').strip() if data.get('full_name') else ''
    email = data.get('email', '').strip().lower() if data.get('email') else ''
    phone = data.get('phone', '').strip() if data.get('phone') else None
    password = data.get('password', '')
    role = data.get('role', 'customer').strip().lower() if data.get('role') else 'customer'

    # 2. Required fields validation
    if not full_name or not email or not password:
        return jsonify({
            "status": "error",
            "message": "full_name, email, and password are required fields"
        }), 400

    # 3. Role validation (only 'customer' or 'venue_owner' allowed)
    allowed_roles = ['customer', 'venue_owner']
    if role not in allowed_roles:
        return jsonify({
            "status": "error",
            "message": "Invalid role. Allowed roles are 'customer' and 'venue_owner'"
        }), 400

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # 4. Check if email already exists
            check_sql = "SELECT id FROM users WHERE email = %s"
            cursor.execute(check_sql, (email,))
            existing_user = cursor.fetchone()

            if existing_user:
                return jsonify({
                    "status": "error",
                    "message": "Email is already registered"
                }), 409

            # 5. Hash the password using bcrypt
            salt = bcrypt.gensalt()
            password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

            # 6. Insert new user into database using parameterized query
            insert_sql = """
                INSERT INTO users (full_name, email, phone, password_hash, role, status)
                VALUES (%s, %s, %s, %s, %s, 'active')
            """
            cursor.execute(insert_sql, (full_name, email, phone, password_hash, role))
            new_user_id = cursor.lastrowid

        # 7. Return success response (without sensitive data)
        return jsonify({
            "status": "success",
            "message": "User registered successfully",
            "data": {
                "id": new_user_id,
                "full_name": full_name,
                "email": email,
                "phone": phone,
                "role": role
            }
        }), 201

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "An error occurred during registration",
            "details": str(e)
        }), 500
    finally:
        if connection:
            connection.close()


@auth_bp.route('/login', methods=['POST'])
def login():
    """
    User Login & JWT Generation Endpoint
    POST /api/auth/login
    """
    # 1. Parse JSON payload
    data = request.get_json()
    if not data:
        return jsonify({
            "status": "error",
            "message": "Request body must be valid JSON"
        }), 400

    email = data.get('email', '').strip().lower() if data.get('email') else ''
    password = data.get('password', '')

    # 2. Required input validation
    if not email or not password:
        return jsonify({
            "status": "error",
            "message": "Email and password are required"
        }), 400

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # 3. Find user by email
            sql = "SELECT id, full_name, email, phone, password_hash, role, status FROM users WHERE email = %s"
            cursor.execute(sql, (email,))
            user = cursor.fetchone()

            # 4. Check if user exists
            if not user:
                return jsonify({
                    "status": "error",
                    "message": "Invalid email or password"
                }), 401

            # 5. Verify submitted password against stored bcrypt hash
            stored_hash = user['password_hash'].encode('utf-8')
            if not bcrypt.checkpw(password.encode('utf-8'), stored_hash):
                return jsonify({
                    "status": "error",
                    "message": "Invalid email or password"
                }), 401

            # 6. Check user status
            if user['status'] != 'active':
                return jsonify({
                    "status": "error",
                    "message": f"Account is {user['status']}. Please contact support."
                }), 403

            # 7. Generate JWT Token (valid for 24 hours)
            token = generate_jwt_token(
                user_id=user['id'],
                email=user['email'],
                role=user['role']
            )

        # 8. Return success response with JWT token & user info (excluding password hash)
        return jsonify({
            "status": "success",
            "message": "Login successful",
            "token": token,
            "user": {
                "id": user['id'],
                "full_name": user['full_name'],
                "email": user['email'],
                "phone": user['phone'],
                "role": user['role']
            }
        }), 200

    except RuntimeError as rerr:
        # Fails explicitly if JWT_SECRET_KEY is missing or empty
        return jsonify({
            "status": "error",
            "message": str(rerr)
        }), 500
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "An error occurred during login",
            "details": str(e)
        }), 500
    finally:
        if connection:
            connection.close()
