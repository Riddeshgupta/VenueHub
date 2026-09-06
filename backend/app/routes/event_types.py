from flask import Blueprint, request, jsonify
from app.database import get_db_connection
from app.auth_utils import verify_request_token

# Create event_types Blueprint
event_types_bp = Blueprint('event_types', __name__)


@event_types_bp.route('', methods=['GET'])
@event_types_bp.route('/', methods=['GET'])
def get_all_event_types():
    """
    Get All Event Types Endpoint (Public)
    GET /api/event-types
    """
    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            sql = "SELECT id, name, description, created_at FROM event_types ORDER BY name ASC"
            cursor.execute(sql)
            event_types = cursor.fetchall()

        return jsonify({
            "status": "success",
            "data": event_types
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "An error occurred while fetching event types"
        }), 500
    finally:
        if connection:
            connection.close()


@event_types_bp.route('', methods=['POST'])
@event_types_bp.route('/', methods=['POST'])
def create_event_type():
    """
    Create Event Type Endpoint (Admin Only)
    POST /api/event-types
    """
    # 1. Authenticate user via JWT token
    payload, auth_error = verify_request_token(request)
    if auth_error:
        return jsonify(auth_error[0]), auth_error[1]

    # 2. Authorize role: Only 'admin' can create event types
    if payload.get('role') != 'admin':
        return jsonify({
            "status": "error",
            "message": "Access denied. Only administrators can create event types."
        }), 403

    # 3. Parse JSON payload
    data = request.get_json()
    if not data:
        return jsonify({
            "status": "error",
            "message": "Request body must be valid JSON"
        }), 400

    name = data.get('name', '').strip() if data.get('name') else ''
    description = data.get('description', '').strip() if data.get('description') else None

    # 4. Required name validation
    if not name:
        return jsonify({
            "status": "error",
            "message": "Event type name is required"
        }), 400

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # 5. Duplicate check
            check_sql = "SELECT id FROM event_types WHERE LOWER(name) = LOWER(%s)"
            cursor.execute(check_sql, (name,))
            if cursor.fetchone():
                return jsonify({
                    "status": "error",
                    "message": "An event type with this name already exists"
                }), 409

            # 6. Insert new event type using parameterized query
            insert_sql = "INSERT INTO event_types (name, description) VALUES (%s, %s)"
            cursor.execute(insert_sql, (name, description))
            new_id = cursor.lastrowid

        return jsonify({
            "status": "success",
            "message": "Event type created successfully",
            "data": {
                "id": new_id,
                "name": name,
                "description": description
            }
        }), 201
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "An error occurred while creating event type"
        }), 500
    finally:
        if connection:
            connection.close()
