from flask import Blueprint, request, jsonify
from app.database import get_db_connection
from app.auth_utils import verify_request_token

# Create pricing Blueprint
pricing_bp = Blueprint('pricing', __name__)

ALLOWED_PRICING_TYPES = {
    'venue_rental',
    'food_per_person',
    'decoration',
    'dj_music',
    'parking',
    'other',
    'tax'
}


@pricing_bp.route('/<int:venue_id>/pricing', methods=['POST'])
def add_pricing_item(venue_id):
    """
    Add Pricing Item Endpoint (Venue Owner of this venue or Admin)
    POST /api/venues/<venue_id>/pricing
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

    pricing_type = data.get('pricing_type', '').strip().lower() if data.get('pricing_type') else ''
    item_name = data.get('item_name', '').strip() if data.get('item_name') else ''
    is_optional = bool(data.get('is_optional', False))

    # 3. Validate required fields presence
    if not pricing_type or not item_name:
        return jsonify({
            "status": "error",
            "message": "pricing_type and item_name are required fields"
        }), 400

    if 'price' not in data or data.get('price') is None:
        return jsonify({
            "status": "error",
            "message": "price is required"
        }), 400

    # 4. Validate pricing_type against database ENUM values
    if pricing_type not in ALLOWED_PRICING_TYPES:
        return jsonify({
            "status": "error",
            "message": f"Invalid pricing_type. Allowed values are: {', '.join(sorted(ALLOWED_PRICING_TYPES))}"
        }), 400

    # 5. Validate price numeric format and non-negative constraint
    try:
        price = float(data.get('price'))
    except (ValueError, TypeError):
        return jsonify({
            "status": "error",
            "message": "price must be a valid number"
        }), 400

    if price < 0:
        return jsonify({
            "status": "error",
            "message": "price must not be negative"
        }), 400

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # 6. Check venue existence and authorization
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

            # 7. Insert pricing item into venue_pricing table
            insert_sql = """
                INSERT INTO venue_pricing (venue_id, pricing_type, item_name, price, is_optional)
                VALUES (%s, %s, %s, %s, %s)
            """
            cursor.execute(insert_sql, (venue_id, pricing_type, item_name, price, is_optional))
            pricing_id = cursor.lastrowid

        return jsonify({
            "status": "success",
            "message": "Pricing item added successfully",
            "data": {
                "id": pricing_id,
                "venue_id": venue_id,
                "pricing_type": pricing_type,
                "item_name": item_name,
                "price": price,
                "is_optional": is_optional
            }
        }), 201
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "An error occurred while adding pricing item"
        }), 500
    finally:
        if connection:
            connection.close()


@pricing_bp.route('/<int:venue_id>/pricing', methods=['GET'])
def get_venue_pricing(venue_id):
    """
    Get Venue Pricing Endpoint (Public)
    GET /api/venues/<venue_id>/pricing
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

            # 2. Fetch all pricing items for the venue
            sql = """
                SELECT id, venue_id, pricing_type, item_name, price, is_optional, created_at, updated_at
                FROM venue_pricing
                WHERE venue_id = %s
                ORDER BY id ASC
            """
            cursor.execute(sql, (venue_id,))
            pricing_items = cursor.fetchall()

        return jsonify({
            "status": "success",
            "data": pricing_items
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "An error occurred while fetching pricing items"
        }), 500
    finally:
        if connection:
            connection.close()


@pricing_bp.route('/<int:venue_id>/pricing/<int:pricing_id>', methods=['DELETE'])
def delete_pricing_item(venue_id, pricing_id):
    """
    Delete Pricing Item Endpoint (Venue Owner of this venue or Admin)
    DELETE /api/venues/<venue_id>/pricing/<pricing_id>
    """
    # 1. Authenticate user via JWT token
    payload, auth_error = verify_request_token(request)
    if auth_error:
        return jsonify(auth_error[0]), auth_error[1]

    user_id = payload.get('user_id')
    user_role = payload.get('role')

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

            # 3. Check pricing item existence and verify it belongs to this venue
            pricing_sql = "SELECT id FROM venue_pricing WHERE id = %s AND venue_id = %s"
            cursor.execute(pricing_sql, (pricing_id, venue_id))
            pricing_item = cursor.fetchone()

            if not pricing_item:
                return jsonify({
                    "status": "error",
                    "message": "Pricing item not found for this venue"
                }), 404

            # 4. Delete pricing item using parameterized query
            delete_sql = "DELETE FROM venue_pricing WHERE id = %s AND venue_id = %s"
            cursor.execute(delete_sql, (pricing_id, venue_id))

        return jsonify({
            "status": "success",
            "message": "Pricing item deleted successfully"
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "An error occurred while deleting pricing item"
        }), 500
    finally:
        if connection:
            connection.close()


@pricing_bp.route('/<int:venue_id>/pricing/<int:pricing_id>', methods=['PUT'])
def update_pricing_item(venue_id, pricing_id):
    """
    Update Pricing Item Endpoint (Venue Owner of this venue or Admin)
    PUT /api/venues/<venue_id>/pricing/<pricing_id>
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

    pricing_type = data.get('pricing_type', '').strip().lower() if data.get('pricing_type') else ''
    item_name = data.get('item_name', '').strip() if data.get('item_name') else ''
    is_optional = bool(data.get('is_optional', False))

    # 3. Validate required fields presence
    if not pricing_type or not item_name:
        return jsonify({
            "status": "error",
            "message": "pricing_type and item_name are required fields"
        }), 400

    if 'price' not in data or data.get('price') is None:
        return jsonify({
            "status": "error",
            "message": "price is required"
        }), 400

    # 4. Validate pricing_type against database ENUM values
    if pricing_type not in ALLOWED_PRICING_TYPES:
        return jsonify({
            "status": "error",
            "message": f"Invalid pricing_type. Allowed values are: {', '.join(sorted(ALLOWED_PRICING_TYPES))}"
        }), 400

    # 5. Validate price numeric format and non-negative constraint
    try:
        price = float(data.get('price'))
    except (ValueError, TypeError):
        return jsonify({
            "status": "error",
            "message": "price must be a valid number"
        }), 400

    if price < 0:
        return jsonify({
            "status": "error",
            "message": "price must not be negative"
        }), 400

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # 6. Check venue existence and authorization
            venue_sql = "SELECT id, owner_id FROM venues WHERE id = %s"
            cursor.execute(venue_sql, (venue_id,))
            venue = cursor.fetchone()

            if not venue:
                return jsonify({
                    "status": "error",
                    "message": "Venue not found"
                }), 404

            if user_role != 'admin' and venue['owner_id'] != user_id:
                return jsonify({
                    "status": "error",
                    "message": "Access denied. You do not own this venue."
                }), 403

            # 7. Check pricing item existence for this venue
            pricing_sql = "SELECT id FROM venue_pricing WHERE id = %s AND venue_id = %s"
            cursor.execute(pricing_sql, (pricing_id, venue_id))
            pricing_item = cursor.fetchone()

            if not pricing_item:
                return jsonify({
                    "status": "error",
                    "message": "Pricing item not found for this venue"
                }), 404

            # 8. Update pricing item
            update_sql = """
                UPDATE venue_pricing
                SET pricing_type = %s, item_name = %s, price = %s, is_optional = %s
                WHERE id = %s AND venue_id = %s
            """
            cursor.execute(update_sql, (pricing_type, item_name, price, is_optional, pricing_id, venue_id))

        return jsonify({
            "status": "success",
            "message": "Pricing item updated successfully",
            "data": {
                "id": pricing_id,
                "venue_id": venue_id,
                "pricing_type": pricing_type,
                "item_name": item_name,
                "price": price,
                "is_optional": is_optional
            }
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "An error occurred while updating pricing item"
        }), 500
    finally:
        if connection:
            connection.close()

