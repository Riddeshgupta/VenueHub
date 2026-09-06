import datetime
from flask import Blueprint, request, jsonify
from app.database import get_db_connection
from app.auth_utils import verify_request_token

# Create wishlist Blueprint
wishlist_bp = Blueprint('wishlist', __name__)


@wishlist_bp.route('/wishlist', methods=['POST'])
def add_to_wishlist():
    """
    Add Venue to Wishlist Endpoint (Customer Only)
    POST /api/wishlist
    """
    # 1. Authenticate user via JWT token
    payload, auth_error = verify_request_token(request)
    if auth_error:
        return jsonify(auth_error[0]), auth_error[1]

    customer_id = payload.get('user_id')
    user_role = payload.get('role')

    # 2. Authorize role: Only 'customer' can manage wishlist
    if user_role != 'customer':
        return jsonify({
            "status": "error",
            "message": "Access denied. Only customers can manage wishlists."
        }), 403

    # 3. Parse JSON request body
    data = request.get_json()
    if not data or 'venue_id' not in data or data.get('venue_id') is None:
        return jsonify({
            "status": "error",
            "message": "venue_id is required"
        }), 400

    venue_id = data.get('venue_id')
    try:
        venue_id = int(venue_id)
    except (ValueError, TypeError):
        return jsonify({
            "status": "error",
            "message": "venue_id must be a valid integer"
        }), 400

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # 4. Verify venue existence, status (approved), and is_active
            venue_sql = "SELECT id, status, is_active FROM venues WHERE id = %s"
            cursor.execute(venue_sql, (venue_id,))
            venue = cursor.fetchone()

            if not venue:
                return jsonify({
                    "status": "error",
                    "message": "Venue not found"
                }), 404

            if venue['status'] != 'approved' or not venue['is_active']:
                return jsonify({
                    "status": "error",
                    "message": "Venue is not available for wishlist"
                }), 400

            # 5. Check if venue is already in customer's wishlist
            check_sql = "SELECT id FROM wishlist WHERE customer_id = %s AND venue_id = %s"
            cursor.execute(check_sql, (customer_id, venue_id))
            existing_entry = cursor.fetchone()

            if existing_entry:
                return jsonify({
                    "status": "error",
                    "message": "Venue is already in your wishlist"
                }), 409

            # 6. Insert record into wishlist
            insert_sql = "INSERT INTO wishlist (customer_id, venue_id) VALUES (%s, %s)"
            cursor.execute(insert_sql, (customer_id, venue_id))
            wishlist_id = cursor.lastrowid
            connection.commit()

        return jsonify({
            "status": "success",
            "message": "Venue added to wishlist successfully",
            "data": {
                "id": wishlist_id,
                "customer_id": customer_id,
                "venue_id": venue_id
            }
        }), 201

    except Exception as e:
        if connection:
            connection.rollback()
        return jsonify({
            "status": "error",
            "message": "An error occurred while adding venue to wishlist"
        }), 500
    finally:
        if connection:
            connection.close()


@wishlist_bp.route('/wishlist/my', methods=['GET'])
def get_my_wishlist():
    """
    Get Logged-in Customer's Wishlist Endpoint
    GET /api/wishlist/my
    """
    # 1. Authenticate user via JWT token
    payload, auth_error = verify_request_token(request)
    if auth_error:
        return jsonify(auth_error[0]), auth_error[1]

    customer_id = payload.get('user_id')
    user_role = payload.get('role')

    # 2. Authorize role: Only 'customer' can view their wishlist
    if user_role != 'customer':
        return jsonify({
            "status": "error",
            "message": "Access denied. Only customers can view their wishlist."
        }), 403

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # 3. Fetch customer wishlist joined with venue details
            sql = """
                SELECT w.id, w.venue_id, v.name AS venue_name, v.city AS venue_city,
                       v.address AS venue_address, v.base_price, v.capacity_min, v.capacity_max,
                       DATE_FORMAT(w.created_at, '%%Y-%%m-%%d %%H:%%i:%%s') AS created_at
                FROM wishlist w
                JOIN venues v ON w.venue_id = v.id
                WHERE w.customer_id = %s
                ORDER BY w.created_at DESC, w.id DESC
            """
            cursor.execute(sql, (customer_id,))
            wishlist_items = cursor.fetchall()

            # Ensure DECIMAL base_price is converted to float
            for item in wishlist_items:
                item['base_price'] = float(item['base_price'])

        return jsonify({
            "status": "success",
            "data": wishlist_items
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "An error occurred while fetching your wishlist"
        }), 500
    finally:
        if connection:
            connection.close()


@wishlist_bp.route('/wishlist/<int:venue_id>', methods=['DELETE'])
def remove_from_wishlist(venue_id):
    """
    Remove Venue from Wishlist Endpoint (Customer Only)
    DELETE /api/wishlist/<venue_id>
    """
    # 1. Authenticate user via JWT token
    payload, auth_error = verify_request_token(request)
    if auth_error:
        return jsonify(auth_error[0]), auth_error[1]

    customer_id = payload.get('user_id')
    user_role = payload.get('role')

    # 2. Authorize role: Only 'customer' can modify their wishlist
    if user_role != 'customer':
        return jsonify({
            "status": "error",
            "message": "Access denied. Only customers can modify their wishlist."
        }), 403

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # 3. Check if entry exists in wishlist for this customer and venue
            check_sql = "SELECT id FROM wishlist WHERE customer_id = %s AND venue_id = %s"
            cursor.execute(check_sql, (customer_id, venue_id))
            entry = cursor.fetchone()

            if not entry:
                return jsonify({
                    "status": "error",
                    "message": "Wishlist entry not found for this venue"
                }), 404

            # 4. Delete entry from wishlist
            delete_sql = "DELETE FROM wishlist WHERE customer_id = %s AND venue_id = %s"
            cursor.execute(delete_sql, (customer_id, venue_id))
            connection.commit()

        return jsonify({
            "status": "success",
            "message": "Venue removed from wishlist successfully"
        }), 200
    except Exception as e:
        if connection:
            connection.rollback()
        return jsonify({
            "status": "error",
            "message": "An error occurred while removing venue from wishlist"
        }), 500
    finally:
        if connection:
            connection.close()
