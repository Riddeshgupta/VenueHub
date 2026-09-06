import datetime
from flask import Blueprint, request, jsonify
from app.database import get_db_connection
from app.auth_utils import verify_request_token

# Create availability Blueprint
availability_bp = Blueprint('availability', __name__)

ALLOWED_STATUSES = {'available', 'booked', 'blocked'}


def validate_date(date_str):
    """Utility function to validate YYYY-MM-DD date format."""
    try:
        datetime.datetime.strptime(date_str, '%Y-%m-%d')
        return True
    except (ValueError, TypeError):
        return False


@availability_bp.route('/<int:venue_id>/availability', methods=['POST'])
def save_availability(venue_id):
    """
    Create / Update Venue Availability Endpoint (Venue Owner of this venue or Admin)
    POST /api/venues/<venue_id>/availability
    """
    # 1. Authenticate user via JWT token
    payload, auth_error = verify_request_token(request)
    if auth_error:
        return jsonify(auth_error[0]), auth_error[1]

    user_id = payload.get('user_id')
    user_role = payload.get('role')

    # 2. Parse request JSON payload
    data = request.get_json()
    if not data:
        return jsonify({
            "status": "error",
            "message": "Request body must be valid JSON"
        }), 400

    date_str = data.get('date', '').strip() if data.get('date') else ''
    status = data.get('status', 'available').strip().lower() if data.get('status') else 'available'
    notes = data.get('notes', '').strip() if data.get('notes') else None

    # 3. Validate required fields & format
    if not date_str:
        return jsonify({
            "status": "error",
            "message": "date is required"
        }), 400

    if not validate_date(date_str):
        return jsonify({
            "status": "error",
            "message": "Invalid date format. Expected YYYY-MM-DD"
        }), 400

    if status not in ALLOWED_STATUSES:
        return jsonify({
            "status": "error",
            "message": f"Invalid status. Allowed values are: {', '.join(sorted(ALLOWED_STATUSES))}"
        }), 400

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # 4. Check venue existence and authorization
            venue_sql = "SELECT id, owner_id FROM venues WHERE id = %s"
            cursor.execute(venue_sql, (venue_id,))
            venue = cursor.fetchone()

            if not venue:
                return jsonify({
                    "status": "error",
                    "message": "Venue not found"
                }), 404

            # Authorization check: Admin or Venue Owner who owns this venue
            if user_role != 'admin' and venue['owner_id'] != user_id:
                return jsonify({
                    "status": "error",
                    "message": "Access denied. You do not own this venue."
                }), 403

            # 5. Check if date is already booked and protect it from manual changes
            check_booked_sql = "SELECT status FROM availability WHERE venue_id = %s AND date = %s"
            cursor.execute(check_booked_sql, (venue_id, date_str))
            existing_rec = cursor.fetchone()
            if existing_rec and existing_rec.get('status') == 'booked':
                return jsonify({
                    "status": "error",
                    "message": "Booked dates cannot be manually changed."
                }), 400

            # 6. Insert or update availability record (ON DUPLICATE KEY UPDATE)
            upsert_sql = """
                INSERT INTO availability (venue_id, date, status, notes)
                VALUES (%s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE status = VALUES(status), notes = VALUES(notes)
            """
            cursor.execute(upsert_sql, (venue_id, date_str, status, notes))

        return jsonify({
            "status": "success",
            "message": "Availability record saved successfully",
            "data": {
                "venue_id": venue_id,
                "date": date_str,
                "status": status,
                "notes": notes
            }
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "An error occurred while saving availability record"
        }), 500
    finally:
        if connection:
            connection.close()


@availability_bp.route('/<int:venue_id>/availability', methods=['GET'])
def get_all_availability(venue_id):
    """
    Get All Availability Records Endpoint (Public)
    GET /api/venues/<venue_id>/availability
    """
    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # 1. Check venue existence
            venue_sql = "SELECT id FROM venues WHERE id = %s"
            cursor.execute(venue_sql, (venue_id,))
            venue = cursor.fetchone()

            if not venue:
                return jsonify({
                    "status": "error",
                    "message": "Venue not found"
                }), 404

            # 2. Fetch all availability records ordered by date ascending
            sql = """
                SELECT id, venue_id, DATE_FORMAT(date, '%%Y-%%m-%%d') AS date, status, notes, created_at, updated_at
                FROM availability
                WHERE venue_id = %s
                ORDER BY date ASC
            """
            cursor.execute(sql, (venue_id,))
            records = cursor.fetchall()

            # Ensure datetime/date objects are formatted cleanly
            for r in records:
                if isinstance(r.get('created_at'), (datetime.date, datetime.datetime)):
                    r['created_at'] = r['created_at'].isoformat()
                if isinstance(r.get('updated_at'), (datetime.date, datetime.datetime)):
                    r['updated_at'] = r['updated_at'].isoformat()

        return jsonify({
            "status": "success",
            "data": records
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "An error occurred while fetching availability records"
        }), 500
    finally:
        if connection:
            connection.close()


@availability_bp.route('/<int:venue_id>/availability/<string:date_str>', methods=['GET'])
def get_availability_by_date(venue_id, date_str):
    """
    Get Availability for Specific Date Endpoint (Public)
    GET /api/venues/<venue_id>/availability/<date>
    """
    if not validate_date(date_str):
        return jsonify({
            "status": "error",
            "message": "Invalid date format. Expected YYYY-MM-DD"
        }), 400

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # 1. Check venue existence
            venue_sql = "SELECT id FROM venues WHERE id = %s"
            cursor.execute(venue_sql, (venue_id,))
            venue = cursor.fetchone()

            if not venue:
                return jsonify({
                    "status": "error",
                    "message": "Venue not found"
                }), 404

            # 2. Fetch availability record for specific date
            sql = """
                SELECT id, venue_id, DATE_FORMAT(date, '%%Y-%%m-%%d') AS date, status, notes
                FROM availability
                WHERE venue_id = %s AND date = %s
            """
            cursor.execute(sql, (venue_id, date_str))
            record = cursor.fetchone()

            if not record:
                # Unlisted dates default to available
                return jsonify({
                    "status": "success",
                    "data": {
                        "venue_id": venue_id,
                        "date": date_str,
                        "status": "available"
                    }
                }), 200

        return jsonify({
            "status": "success",
            "data": record
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "An error occurred while fetching availability record"
        }), 500
    finally:
        if connection:
            connection.close()


@availability_bp.route('/<int:venue_id>/availability/<string:date_str>', methods=['DELETE'])
def delete_availability(venue_id, date_str):
    """
    Delete Availability Record Endpoint (Venue Owner of this venue or Admin)
    DELETE /api/venues/<venue_id>/availability/<date>
    """
    # 1. Authenticate user via JWT token
    payload, auth_error = verify_request_token(request)
    if auth_error:
        return jsonify(auth_error[0]), auth_error[1]

    user_id = payload.get('user_id')
    user_role = payload.get('role')

    if not validate_date(date_str):
        return jsonify({
            "status": "error",
            "message": "Invalid date format. Expected YYYY-MM-DD"
        }), 400

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # 2. Check venue existence and ownership
            venue_sql = "SELECT id, owner_id FROM venues WHERE id = %s"
            cursor.execute(venue_sql, (venue_id,))
            venue = cursor.fetchone()

            if not venue:
                return jsonify({
                    "status": "error",
                    "message": "Venue not found"
                }), 404

            # Authorization check: Admin or Venue Owner who owns this venue
            if user_role != 'admin' and venue['owner_id'] != user_id:
                return jsonify({
                    "status": "error",
                    "message": "Access denied. You do not own this venue."
                }), 403

            # 3. Check record existence and status
            check_sql = "SELECT id, status FROM availability WHERE venue_id = %s AND date = %s"
            cursor.execute(check_sql, (venue_id, date_str))
            record = cursor.fetchone()

            if not record:
                return jsonify({
                    "status": "error",
                    "message": "Availability record for this date not found"
                }), 404

            if record.get('status') == 'booked':
                return jsonify({
                    "status": "error",
                    "message": "Booked dates cannot be manually deleted."
                }), 400

            # 4. Delete record
            delete_sql = "DELETE FROM availability WHERE venue_id = %s AND date = %s"
            cursor.execute(delete_sql, (venue_id, date_str))

        return jsonify({
            "status": "success",
            "message": "Availability record deleted successfully"
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "An error occurred while deleting availability record"
        }), 500
    finally:
        if connection:
            connection.close()
