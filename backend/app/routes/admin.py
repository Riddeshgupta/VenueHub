from flask import Blueprint, request, jsonify
from app.database import get_db_connection
from app.auth_utils import verify_request_token

# Create admin Blueprint
admin_bp = Blueprint('admin', __name__)


def verify_admin_access():
    """
    Helper to verify JWT token and ensure the requesting user has the 'admin' role.
    Returns (payload, None, 200) on success or (None, response_json, status_code) on error.
    """
    payload, auth_error = verify_request_token(request)
    if auth_error:
        return None, jsonify(auth_error[0]), auth_error[1]
    
    if payload.get('role') != 'admin':
        return None, jsonify({
            "status": "error",
            "message": "Access denied. Administrator privileges required."
        }), 403

    return payload, None, 200


@admin_bp.route('/stats', methods=['GET'])
def get_dashboard_stats():
    """
    Get Overview Aggregate Dashboard Statistics Endpoint (Admin Only)
    GET /api/admin/stats
    """
    payload, err_resp, err_code = verify_admin_access()
    if err_resp:
        return err_resp, err_code

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # 1. Total users
            cursor.execute("SELECT COUNT(*) AS total FROM users")
            total_users = cursor.fetchone()['total']

            # 2. Total venues
            cursor.execute("SELECT COUNT(*) AS total FROM venues")
            total_venues = cursor.fetchone()['total']

            # 3. Pending venue approvals
            cursor.execute("SELECT COUNT(*) AS total FROM venues WHERE status = 'pending'")
            pending_venues = cursor.fetchone()['total']

            # 4. Total bookings
            cursor.execute("SELECT COUNT(*) AS total FROM bookings")
            total_bookings = cursor.fetchone()['total']

            # 5. Total quotations
            cursor.execute("SELECT COUNT(*) AS total FROM quotations")
            total_quotations = cursor.fetchone()['total']

            # 6. Total reviews
            cursor.execute("SELECT COUNT(*) AS total FROM reviews")
            total_reviews = cursor.fetchone()['total']

        return jsonify({
            "status": "success",
            "data": {
                "total_users": total_users,
                "total_venues": total_venues,
                "pending_venues": pending_venues,
                "total_bookings": total_bookings,
                "total_quotations": total_quotations,
                "total_reviews": total_reviews
            }
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "An error occurred while fetching admin stats",
            "details": str(e)
        }), 500
    finally:
        if connection:
            connection.close()


@admin_bp.route('/venues', methods=['GET'])
def get_all_venues_admin():
    """
    Get All Venues Endpoint Across All Owners & Statuses (Admin Only)
    GET /api/admin/venues
    """
    payload, err_resp, err_code = verify_admin_access()
    if err_resp:
        return err_resp, err_code

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            sql = """
                SELECT v.id, v.owner_id, u.full_name AS owner_name, u.email AS owner_email,
                       v.name, v.description, v.address, v.city, v.state, v.pincode,
                       v.capacity_min, v.capacity_max, v.base_price, v.status, v.is_active,
                       DATE_FORMAT(v.created_at, '%%Y-%%m-%%d %%H:%%i:%%s') AS created_at
                FROM venues v
                LEFT JOIN users u ON v.owner_id = u.id
                ORDER BY v.created_at DESC, v.id DESC
            """
            cursor.execute(sql)
            venues = cursor.fetchall()

            for venue in venues:
                if venue.get('base_price') is not None:
                    venue['base_price'] = float(venue['base_price'])

        return jsonify({
            "status": "success",
            "data": venues
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "An error occurred while fetching admin venues",
            "details": str(e)
        }), 500
    finally:
        if connection:
            connection.close()


@admin_bp.route('/venues/<int:venue_id>/status', methods=['PUT'])
def update_venue_approval_status(venue_id):
    """
    Approve/Reject/Pending Venue Status Endpoint (Admin Only)
    PUT /api/admin/venues/<venue_id>/status
    Payload: { "status": "approved" | "rejected" | "pending" }
    """
    payload, err_resp, err_code = verify_admin_access()
    if err_resp:
        return err_resp, err_code

    data = request.get_json()
    if not data or 'status' not in data:
        return jsonify({
            "status": "error",
            "message": "status field is required"
        }), 400

    new_status = str(data.get('status')).strip().lower()
    allowed_statuses = ['approved', 'rejected', 'pending']
    if new_status not in allowed_statuses:
        return jsonify({
            "status": "error",
            "message": f"Invalid status. Allowed values are: {', '.join(allowed_statuses)}"
        }), 400

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # Verify venue exists
            cursor.execute("SELECT id, name, status, is_active FROM venues WHERE id = %s", (venue_id,))
            venue = cursor.fetchone()
            if not venue:
                return jsonify({
                    "status": "error",
                    "message": "Venue not found"
                }), 404

            # Update status column only
            cursor.execute("UPDATE venues SET status = %s WHERE id = %s", (new_status, venue_id))

        return jsonify({
            "status": "success",
            "message": f"Venue #{venue_id} ('{venue['name']}') status updated to '{new_status}'",
            "data": {
                "id": venue_id,
                "status": new_status,
                "is_active": venue['is_active']
            }
        }), 200

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "An error occurred while updating venue status",
            "details": str(e)
        }), 500
    finally:
        if connection:
            connection.close()


@admin_bp.route('/venues/<int:venue_id>/active', methods=['PUT'])
def update_venue_active_toggle(venue_id):
    """
    Activate/Deactivate Venue Active Flag Endpoint (Admin Only)
    PUT /api/admin/venues/<venue_id>/active
    Payload: { "is_active": boolean }
    """
    payload, err_resp, err_code = verify_admin_access()
    if err_resp:
        return err_resp, err_code

    data = request.get_json()
    if not data or 'is_active' not in data:
        return jsonify({
            "status": "error",
            "message": "is_active boolean is required"
        }), 400

    is_active = bool(data.get('is_active'))

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            cursor.execute("SELECT id, name, status FROM venues WHERE id = %s", (venue_id,))
            venue = cursor.fetchone()
            if not venue:
                return jsonify({
                    "status": "error",
                    "message": "Venue not found"
                }), 404

            cursor.execute("UPDATE venues SET is_active = %s WHERE id = %s", (is_active, venue_id))

        return jsonify({
            "status": "success",
            "message": f"Venue #{venue_id} ('{venue['name']}') marked as {'active' if is_active else 'inactive'}",
            "data": {
                "id": venue_id,
                "status": venue['status'],
                "is_active": is_active
            }
        }), 200

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "An error occurred while updating venue active state",
            "details": str(e)
        }), 500
    finally:
        if connection:
            connection.close()


@admin_bp.route('/users', methods=['GET'])
def get_all_users_admin():
    """
    Get All Platform Users Endpoint (Admin Only)
    GET /api/admin/users
    Explicitly excludes password_hash and secrets.
    """
    payload, err_resp, err_code = verify_admin_access()
    if err_resp:
        return err_resp, err_code

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            sql = """
                SELECT id, full_name, email, phone, role, status,
                       DATE_FORMAT(created_at, '%%Y-%%m-%%d %%H:%%i:%%s') AS created_at
                FROM users
                ORDER BY created_at DESC, id DESC
            """
            cursor.execute(sql)
            users = cursor.fetchall()

        return jsonify({
            "status": "success",
            "data": users
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "An error occurred while fetching users",
            "details": str(e)
        }), 500
    finally:
        if connection:
            connection.close()


@admin_bp.route('/users/<int:user_id>/status', methods=['PUT'])
def update_user_status(user_id):
    """
    Activate/Deactivate User Account Endpoint (Admin Only)
    PUT /api/admin/users/<user_id>/status
    Payload: { "status": "active" | "inactive" }
    Prevents admin from deactivating their own account.
    """
    payload, err_resp, err_code = verify_admin_access()
    if err_resp:
        return err_resp, err_code

    current_admin_id = payload.get('user_id')
    if current_admin_id == user_id:
        return jsonify({
            "status": "error",
            "message": "Security error: You cannot change the status of your own admin account."
        }), 400

    data = request.get_json()
    if not data or 'status' not in data:
        return jsonify({
            "status": "error",
            "message": "status field is required"
        }), 400

    new_status = str(data.get('status')).strip().lower()
    if new_status not in ('active', 'inactive'):
        return jsonify({
            "status": "error",
            "message": "Invalid status. Allowed values are 'active' or 'inactive'."
        }), 400

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            cursor.execute("SELECT id, full_name, role FROM users WHERE id = %s", (user_id,))
            target_user = cursor.fetchone()
            if not target_user:
                return jsonify({
                    "status": "error",
                    "message": "User not found"
                }), 404

            cursor.execute("UPDATE users SET status = %s WHERE id = %s", (new_status, user_id))

        return jsonify({
            "status": "success",
            "message": f"User #{user_id} ('{target_user['full_name']}') status updated to '{new_status}'",
            "data": {
                "id": user_id,
                "status": new_status
            }
        }), 200

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "An error occurred while updating user status",
            "details": str(e)
        }), 500
    finally:
        if connection:
            connection.close()


@admin_bp.route('/bookings', methods=['GET'])
def get_all_bookings_admin_endpoint():
    """
    Get All Platform Bookings Endpoint (Admin Only)
    GET /api/admin/bookings
    """
    payload, err_resp, err_code = verify_admin_access()
    if err_resp:
        return err_resp, err_code

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            sql = """
                SELECT b.id, b.customer_id, cu.full_name AS customer_name, cu.email AS customer_email,
                       b.venue_id, v.name AS venue_name, b.quotation_id,
                       DATE_FORMAT(b.event_date, '%%Y-%%m-%%d') AS event_date,
                       b.guest_count, b.total_amount, b.status,
                       DATE_FORMAT(b.created_at, '%%Y-%%m-%%d %%H:%%i:%%s') AS created_at
                FROM bookings b
                LEFT JOIN users cu ON b.customer_id = cu.id
                LEFT JOIN venues v ON b.venue_id = v.id
                ORDER BY b.created_at DESC, b.id DESC
            """
            cursor.execute(sql)
            bookings = cursor.fetchall()

            for b in bookings:
                if b.get('total_amount') is not None:
                    b['total_amount'] = float(b['total_amount'])

        return jsonify({
            "status": "success",
            "data": bookings
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "An error occurred while fetching admin bookings",
            "details": str(e)
        }), 500
    finally:
        if connection:
            connection.close()


@admin_bp.route('/quotations', methods=['GET'])
def get_all_quotations_admin_endpoint():
    """
    Get All Platform Quotation Requests Endpoint (Admin Only)
    GET /api/admin/quotations
    """
    payload, err_resp, err_code = verify_admin_access()
    if err_resp:
        return err_resp, err_code

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            sql = """
                SELECT q.id, q.customer_id, cu.full_name AS customer_name, cu.email AS customer_email,
                       q.venue_id, v.name AS venue_name,
                       q.event_type_id, et.name AS event_type_name,
                       DATE_FORMAT(q.event_date, '%%Y-%%m-%%d') AS event_date,
                       q.guest_count, q.total_amount, q.status,
                       DATE_FORMAT(q.created_at, '%%Y-%%m-%%d %%H:%%i:%%s') AS created_at
                FROM quotations q
                LEFT JOIN users cu ON q.customer_id = cu.id
                LEFT JOIN venues v ON q.venue_id = v.id
                LEFT JOIN event_types et ON q.event_type_id = et.id
                ORDER BY q.created_at DESC, q.id DESC
            """
            cursor.execute(sql)
            quotations = cursor.fetchall()

            for q in quotations:
                if q.get('total_amount') is not None:
                    q['total_amount'] = float(q['total_amount'])

        return jsonify({
            "status": "success",
            "data": quotations
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "An error occurred while fetching admin quotations",
            "details": str(e)
        }), 500
    finally:
        if connection:
            connection.close()


@admin_bp.route('/reviews', methods=['GET'])
def get_all_reviews_admin_endpoint():
    """
    Get All Platform Reviews Endpoint (Admin Only)
    GET /api/admin/reviews
    """
    payload, err_resp, err_code = verify_admin_access()
    if err_resp:
        return err_resp, err_code

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            sql = """
                SELECT r.id, r.booking_id, r.venue_id, v.name AS venue_name,
                       r.customer_id, cu.full_name AS customer_name,
                       r.rating, r.comment,
                       DATE_FORMAT(r.created_at, '%%Y-%%m-%%d %%H:%%i:%%s') AS created_at
                FROM reviews r
                LEFT JOIN users cu ON r.customer_id = cu.id
                LEFT JOIN venues v ON r.venue_id = v.id
                ORDER BY r.created_at DESC, r.id DESC
            """
            cursor.execute(sql)
            reviews = cursor.fetchall()

        return jsonify({
            "status": "success",
            "data": reviews
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "An error occurred while fetching admin reviews",
            "details": str(e)
        }), 500
    finally:
        if connection:
            connection.close()
