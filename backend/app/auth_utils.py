import os
import datetime
import jwt
from dotenv import load_dotenv

# Ensure environment variables are loaded from backend/.env
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(dotenv_path=env_path)


def get_jwt_secret():
    """
    Retrieves the JWT secret key from environment variables.
    Fails explicitly if the secret key is missing or empty.
    """
    secret = os.getenv('JWT_SECRET_KEY')
    if not secret or not secret.strip():
        raise RuntimeError("JWT_SECRET_KEY environment variable is missing or empty. Please set JWT_SECRET_KEY in backend/.env")
    return secret.strip()


def generate_jwt_token(user_id, email, role, expires_in_hours=24):
    """
    Generates a signed JWT token containing user details and expiration timestamp.
    """
    secret = get_jwt_secret()
    now = datetime.datetime.now(datetime.timezone.utc)
    payload = {
        'user_id': user_id,
        'email': email,
        'role': role,
        'iat': now,
        'exp': now + datetime.timedelta(hours=expires_in_hours)
    }
    # PyJWT 2.x returns string
    token = jwt.encode(payload, secret, algorithm='HS256')
    return token


def decode_jwt_token(token):
    """
    Decodes and validates a JWT token.
    Returns (payload, None) on success or (None, error_message) on failure.
    """
    try:
        secret = get_jwt_secret()
        payload = jwt.decode(token, secret, algorithms=['HS256'])
        return payload, None
    except jwt.ExpiredSignatureError:
        return None, "Token has expired"
    except jwt.InvalidTokenError:
        return None, "Invalid or corrupted token"
    except Exception as e:
        return None, str(e)


def verify_request_token(request):
    """
    Helper function to extract and verify the JWT token from the HTTP Authorization header.
    Expects header format: Authorization: Bearer <token>
    Returns:
        (payload, None) on success
        (None, (error_json, status_code)) on failure
    """
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return None, ({
            "status": "error",
            "message": "Authorization header is missing"
        }, 401)

    parts = auth_header.split()
    if len(parts) != 2 or parts[0].lower() != 'bearer':
        return None, ({
            "status": "error",
            "message": "Invalid Authorization header format. Expected 'Bearer <token>'"
        }, 401)

    token = parts[1]
    payload, error = decode_jwt_token(token)
    if error:
        return None, ({
            "status": "error",
            "message": f"Authentication failed: {error}"
        }, 401)

    return payload, None
