from flask import Blueprint, request, jsonify
from app.database import get_db_connection
from app.auth_utils import verify_request_token

# Create facilities Blueprint
facilities_bp = Blueprint('facilities', __name__)


@facilities_bp.route('', methods=['GET'])
@facilities_bp.route('/', methods=['GET'])
def get_all_facilities():
    """
    Get All Facilities Endpoint (Public)
    GET /api/facilities
    """
    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            sql = "SELECT id, name, icon, created_at FROM facilities ORDER BY name ASC"
            cursor.execute(sql)
            facilities = cursor.fetchall()

        return jsonify({
            "status": "success",
            "data": facilities
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "An error occurred while fetching facilities"
        }), 500
    finally:
        if connection:
            connection.close()


@facilities_bp.route('', methods=['POST'])
@facilities_bp.route('/', methods=['POST'])
def create_facility():
    """
    Create Facility Endpoint (Admin Only)
    POST /api/facilities
    """
    # 1. Authenticate user via JWT token
    payload, auth_error = verify_request_token(request)
    if auth_error:
        return jsonify(auth_error[0]), auth_error[1]

    # 2. Authorize role: Only 'admin' can create facilities
    if payload.get('role') != 'admin':
        return jsonify({
            "status": "error",
            "message": "Access denied. Only administrators can create facilities."
        }), 403

    # 3. Parse JSON payload
    data = request.get_json()
    if not data:
        return jsonify({
            "status": "error",
            "message": "Request body must be valid JSON"
        }), 400

    name = data.get('name', '').strip() if data.get('name') else ''
    icon = data.get('icon', '').strip() if data.get('icon') else None

    # 4. Required name validation
    if not name:
        return jsonify({
            "status": "error",
            "message": "Facility name is required"
        }), 400

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # 5. Duplicate check
            check_sql = "SELECT id FROM facilities WHERE LOWER(name) = LOWER(%s)"
            cursor.execute(check_sql, (name,))
            if cursor.fetchone():
                return jsonify({
                    "status": "error",
                    "message": "A facility with this name already exists"
                }), 409

            # 6. Insert new facility using parameterized query
            insert_sql = "INSERT INTO facilities (name, icon) VALUES (%s, %s)"
            cursor.execute(insert_sql, (name, icon))
            new_id = cursor.lastrowid

        return jsonify({
            "status": "success",
            "message": "Facility created successfully",
            "data": {
                "id": new_id,
                "name": name,
                "icon": icon
            }
        }), 201
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "An error occurred while creating facility"
        }), 500
    finally:
        if connection:
            connection.close()
