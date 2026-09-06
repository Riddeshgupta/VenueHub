import datetime
from flask import Blueprint, request, jsonify
from app.database import get_db_connection
from app.auth_utils import verify_request_token

# Create quotations Blueprint
quotations_bp = Blueprint('quotations', __name__)


def validate_date(date_str):
    """Utility function to validate YYYY-MM-DD date format."""
    try:
        datetime.datetime.strptime(date_str, '%Y-%m-%d')
        return True
    except (ValueError, TypeError):
        return False


@quotations_bp.route('/quotations', methods=['POST'])
def create_quotation_request():
    """
    Create Quotation Request Endpoint (Customer Only)
    POST /api/quotations
    """
    # 1. Authenticate user via JWT token
    payload, auth_error = verify_request_token(request)
    if auth_error:
        return jsonify(auth_error[0]), auth_error[1]

    customer_id = payload.get('user_id')
    user_role = payload.get('role')

    # 2. Authorize role: Only 'customer' can submit quotation requests
    if user_role != 'customer':
        return jsonify({
            "status": "error",
            "message": "Access denied. Only customers can request venue quotations."
        }), 403

    # 3. Parse request JSON payload
    data = request.get_json()
    if not data:
        return jsonify({
            "status": "error",
            "message": "Request body must be valid JSON"
        }), 400

    venue_id = data.get('venue_id')
    event_type_id = data.get('event_type_id')
    event_date = data.get('event_date', '').strip() if data.get('event_date') else ''
    message = data.get('message', '').strip() if data.get('message') else None

    # 4. Required fields check
    if not venue_id or not event_type_id or not event_date:
        return jsonify({
            "status": "error",
            "message": "venue_id, event_type_id, and event_date are required"
        }), 400

    if 'guest_count' not in data or data.get('guest_count') is None:
        return jsonify({
            "status": "error",
            "message": "guest_count is required"
        }), 400

    # 5. Numeric & Format Validation
    try:
        venue_id = int(venue_id)
        event_type_id = int(event_type_id)
        guest_count = int(data.get('guest_count'))
    except (ValueError, TypeError):
        return jsonify({
            "status": "error",
            "message": "venue_id, event_type_id, and guest_count must be valid integers"
        }), 400

    if guest_count <= 0:
        return jsonify({
            "status": "error",
            "message": "guest_count must be a positive integer"
        }), 400

    if not validate_date(event_date):
        return jsonify({
            "status": "error",
            "message": "Invalid event_date format. Expected YYYY-MM-DD"
        }), 400

    connection = None
    try:
        connection = get_db_connection()
        connection.autocommit(False)
        with connection.cursor() as cursor:
            # 6. Verify venue exists, is approved, and is active
            venue_sql = "SELECT id, owner_id, name, capacity_min, capacity_max, status, is_active FROM venues WHERE id = %s"
            cursor.execute(venue_sql, (venue_id,))
            venue = cursor.fetchone()

            if not venue:
                connection.rollback()
                return jsonify({
                    "status": "error",
                    "message": "Venue not found"
                }), 404

            if venue['status'] != 'approved' or not venue['is_active']:
                connection.rollback()
                return jsonify({
                    "status": "error",
                    "message": "Venue is currently not available for quotation requests"
                }), 400

            # 7. Verify guest_count is within venue capacity range
            if guest_count < venue['capacity_min'] or guest_count > venue['capacity_max']:
                connection.rollback()
                return jsonify({
                    "status": "error",
                    "message": f"Guest count must be between {venue['capacity_min']} and {venue['capacity_max']} for this venue"
                }), 400

            # 8. Verify event_type exists
            et_sql = "SELECT id FROM event_types WHERE id = %s"
            cursor.execute(et_sql, (event_type_id,))
            if not cursor.fetchone():
                connection.rollback()
                return jsonify({
                    "status": "error",
                    "message": "Event type not found"
                }), 400

            # 9. Verify venue supports the selected event type
            vet_sql = "SELECT venue_id FROM venue_event_types WHERE venue_id = %s AND event_type_id = %s"
            cursor.execute(vet_sql, (venue_id, event_type_id))
            if not cursor.fetchone():
                connection.rollback()
                return jsonify({
                    "status": "error",
                    "message": "Venue does not support the selected event type"
                }), 400

            # 10. Check venue availability on the requested event date
            avail_sql = "SELECT status FROM availability WHERE venue_id = %s AND date = %s"
            cursor.execute(avail_sql, (venue_id, event_date))
            avail = cursor.fetchone()

            if avail and avail['status'] in ('blocked', 'booked'):
                connection.rollback()
                return jsonify({
                    "status": "error",
                    "message": f"Venue is already {avail['status']} on the selected date"
                }), 400

            # 11. Insert quotation request into database
            insert_sql = """
                INSERT INTO quotations (customer_id, venue_id, event_type_id, event_date, guest_count, message, total_amount, status)
                VALUES (%s, %s, %s, %s, %s, %s, 0.00, 'pending')
            """
            cursor.execute(insert_sql, (customer_id, venue_id, event_type_id, event_date, guest_count, message))
            quotation_id = cursor.lastrowid

            # 12. Create notification for the venue owner
            notif_sql = """
                INSERT INTO notifications (user_id, title, message, is_read)
                VALUES (%s, %s, %s, FALSE)
            """
            notif_title = "New Quotation Request"
            notif_message = f"A customer requested a quotation for {venue['name']} on {event_date} ({guest_count} guests)."
            cursor.execute(notif_sql, (venue['owner_id'], notif_title, notif_message))

        # Commit transaction atomically
        connection.commit()

        return jsonify({
            "status": "success",
            "message": "Quotation request submitted successfully",
            "data": {
                "id": quotation_id,
                "customer_id": customer_id,
                "venue_id": venue_id,
                "event_type_id": event_type_id,
                "event_date": event_date,
                "guest_count": guest_count,
                "message": message,
                "total_amount": 0.00,
                "status": "pending"
            }
        }), 201

    except Exception as e:
        if connection:
            connection.rollback()
        return jsonify({
            "status": "error",
            "message": "An error occurred while creating quotation request"
        }), 500
    finally:
        if connection:
            connection.close()


@quotations_bp.route('/quotations/my', methods=['GET'])
def get_my_quotation_requests():
    """
    Get Logged-in Customer's Quotation Requests Endpoint
    GET /api/quotations/my
    """
    payload, auth_error = verify_request_token(request)
    if auth_error:
        return jsonify(auth_error[0]), auth_error[1]

    customer_id = payload.get('user_id')
    user_role = payload.get('role')

    if user_role != 'customer':
        return jsonify({
            "status": "error",
            "message": "Access denied. Only customers can view their quotation requests."
        }), 403

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            sql = """
                SELECT q.id, q.customer_id, q.venue_id, v.name AS venue_name, v.city AS venue_city,
                       q.event_type_id, et.name AS event_type_name,
                       DATE_FORMAT(q.event_date, '%%Y-%%m-%%d') AS event_date,
                       q.guest_count, q.message, q.total_amount, q.status,
                       DATE_FORMAT(q.created_at, '%%Y-%%m-%%d %%H:%%i:%%s') AS created_at
                FROM quotations q
                JOIN venues v ON q.venue_id = v.id
                LEFT JOIN event_types et ON q.event_type_id = et.id
                WHERE q.customer_id = %s
                ORDER BY q.created_at DESC
            """
            cursor.execute(sql, (customer_id,))
            quotations = cursor.fetchall()

        return jsonify({
            "status": "success",
            "data": quotations
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "An error occurred while fetching your quotation requests"
        }), 500
    finally:
        if connection:
            connection.close()


@quotations_bp.route('/quotations/<int:quotation_id>', methods=['GET'])
def get_quotation_details(quotation_id):
    """
    Get Single Quotation Request Details Endpoint
    GET /api/quotations/<quotation_id>
    Accessible by the customer who requested it, the venue owner, or admin.
    """
    payload, auth_error = verify_request_token(request)
    if auth_error:
        return jsonify(auth_error[0]), auth_error[1]

    user_id = payload.get('user_id')
    user_role = payload.get('role')

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            sql = """
                SELECT q.id, q.customer_id, q.venue_id, v.name AS venue_name, v.city AS venue_city, v.owner_id AS venue_owner_id,
                       q.event_type_id, et.name AS event_type_name,
                       DATE_FORMAT(q.event_date, '%%Y-%%m-%%d') AS event_date,
                       q.guest_count, q.message, q.total_amount, q.status,
                       DATE_FORMAT(q.created_at, '%%Y-%%m-%%d %%H:%%i:%%s') AS created_at
                FROM quotations q
                JOIN venues v ON q.venue_id = v.id
                LEFT JOIN event_types et ON q.event_type_id = et.id
                WHERE q.id = %s
            """
            cursor.execute(sql, (quotation_id,))
            quotation = cursor.fetchone()

            if not quotation:
                return jsonify({
                    "status": "error",
                    "message": "Quotation request not found"
                }), 404

            # Authorization: Customer who requested it, Venue owner of the venue, or Admin
            if user_role != 'admin' and quotation['customer_id'] != user_id and quotation['venue_owner_id'] != user_id:
                return jsonify({
                    "status": "error",
                    "message": "Access denied. You do not have permission to view this quotation request."
                }), 403

            # Remove internal ownership helper key from output
            quotation.pop('venue_owner_id', None)

            # Fetch quotation items if present
            items_sql = """
                SELECT id, item_name, unit_price, quantity, total_price
                FROM quotation_items
                WHERE quotation_id = %s
                ORDER BY id ASC
            """
            cursor.execute(items_sql, (quotation_id,))
            quotation['items'] = cursor.fetchall()

        return jsonify({
            "status": "success",
            "data": quotation
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "An error occurred while fetching quotation details"
        }), 500
    finally:
        if connection:
            connection.close()


@quotations_bp.route('/venues/<int:venue_id>/quotations', methods=['GET'])
def get_venue_incoming_quotations(venue_id):
    """
    Get Incoming Quotation Requests for a Specific Venue (Venue Owner of this venue or Admin)
    GET /api/venues/<venue_id>/quotations
    """
    payload, auth_error = verify_request_token(request)
    if auth_error:
        return jsonify(auth_error[0]), auth_error[1]

    user_id = payload.get('user_id')
    user_role = payload.get('role')

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # 1. Verify venue existence and ownership
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

            # 2. Fetch incoming quotation requests for this venue
            sql = """
                SELECT q.id, q.customer_id, u.full_name AS customer_name, u.email AS customer_email, u.phone AS customer_phone,
                       q.event_type_id, et.name AS event_type_name,
                       DATE_FORMAT(q.event_date, '%%Y-%%m-%%d') AS event_date,
                       q.guest_count, q.message, q.total_amount, q.status,
                       DATE_FORMAT(q.created_at, '%%Y-%%m-%%d %%H:%%i:%%s') AS created_at
                FROM quotations q
                JOIN users u ON q.customer_id = u.id
                LEFT JOIN event_types et ON q.event_type_id = et.id
                WHERE q.venue_id = %s
                ORDER BY q.created_at DESC
            """
            cursor.execute(sql, (venue_id,))
            quotations = cursor.fetchall()

        return jsonify({
            "status": "success",
            "data": quotations
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "An error occurred while fetching incoming quotation requests"
        }), 500
    finally:
        if connection:
            connection.close()


@quotations_bp.route('/quotations/<int:quotation_id>/quote', methods=['POST'])
def respond_quotation(quotation_id):
    """
    Provide Quotation Response Endpoint (Venue Owner of that venue or Admin)
    POST /api/quotations/<quotation_id>/quote
    """
    # 1. Authenticate user via JWT token
    payload, auth_error = verify_request_token(request)
    if auth_error:
        return jsonify(auth_error[0]), auth_error[1]

    user_id = payload.get('user_id')
    user_role = payload.get('role')

    # 2. Authorize role: Only 'venue_owner' or 'admin' can provide quotation responses
    if user_role not in ('venue_owner', 'admin'):
        return jsonify({
            "status": "error",
            "message": "Access denied. Only venue owners and admins can respond to quotation requests."
        }), 403

    # 3. Parse JSON request payload
    data = request.get_json()
    if not data or 'items' not in data:
        return jsonify({
            "status": "error",
            "message": "items array is required"
        }), 400

    items_input = data.get('items')
    if not isinstance(items_input, list) or len(items_input) == 0:
        return jsonify({
            "status": "error",
            "message": "items must be a non-empty list"
        }), 400

    # 4. Validate items array format & values
    validated_items = []
    total_amount = 0.0

    for idx, item in enumerate(items_input, start=1):
        if not isinstance(item, dict):
            return jsonify({
                "status": "error",
                "message": f"Item at index {idx} must be an object"
            }), 400

        item_name = item.get('item_name', '').strip() if item.get('item_name') else ''
        if not item_name:
            return jsonify({
                "status": "error",
                "message": f"item_name is required for item at index {idx}"
            }), 400

        if 'unit_price' not in item or item.get('unit_price') is None:
            return jsonify({
                "status": "error",
                "message": f"unit_price is required for item at index {idx}"
            }), 400

        if 'quantity' not in item or item.get('quantity') is None:
            return jsonify({
                "status": "error",
                "message": f"quantity is required for item at index {idx}"
            }), 400

        try:
            unit_price = float(item.get('unit_price'))
            quantity = int(item.get('quantity'))
        except (ValueError, TypeError):
            return jsonify({
                "status": "error",
                "message": f"unit_price and quantity must be valid numbers for item at index {idx}"
            }), 400

        if unit_price < 0:
            return jsonify({
                "status": "error",
                "message": f"unit_price must not be negative for item at index {idx}"
            }), 400

        if quantity <= 0:
            return jsonify({
                "status": "error",
                "message": f"quantity must be greater than 0 for item at index {idx}"
            }), 400

        total_price = round(unit_price * quantity, 2)
        total_amount += total_price

        validated_items.append({
            "item_name": item_name,
            "unit_price": unit_price,
            "quantity": quantity,
            "total_price": total_price
        })

    total_amount = round(total_amount, 2)

    connection = None
    try:
        connection = get_db_connection()
        # Disable autocommit to manage explicitly formatted transaction
        connection.autocommit(False)

        with connection.cursor() as cursor:
            # 5. Find quotation and verify venue ownership
            sql = """
                SELECT q.id, q.status, q.venue_id, q.customer_id,
                       DATE_FORMAT(q.event_date, '%%Y-%%m-%%d') AS event_date,
                       v.name AS venue_name, v.owner_id AS venue_owner_id
                FROM quotations q
                JOIN venues v ON q.venue_id = v.id
                WHERE q.id = %s
            """
            cursor.execute(sql, (quotation_id,))
            quotation = cursor.fetchone()

            if not quotation:
                connection.rollback()
                return jsonify({
                    "status": "error",
                    "message": "Quotation request not found"
                }), 404

            # Authorization check: Admin or Venue Owner who owns the venue
            if user_role != 'admin' and quotation['venue_owner_id'] != user_id:
                connection.rollback()
                return jsonify({
                    "status": "error",
                    "message": "Access denied. You do not own the venue for this quotation request."
                }), 403

            # Status check: Must be 'pending'
            if quotation['status'] != 'pending':
                connection.rollback()
                return jsonify({
                    "status": "error",
                    "message": f"Cannot quote a request with status '{quotation['status']}'"
                }), 400

            # 6. Insert quotation line items into quotation_items table
            inserted_items = []
            item_insert_sql = """
                INSERT INTO quotation_items (quotation_id, item_name, unit_price, quantity, total_price)
                VALUES (%s, %s, %s, %s, %s)
            """
            for item in validated_items:
                cursor.execute(item_insert_sql, (
                    quotation_id,
                    item['item_name'],
                    item['unit_price'],
                    item['quantity'],
                    item['total_price']
                ))
                inserted_items.append({
                    "id": cursor.lastrowid,
                    "item_name": item['item_name'],
                    "unit_price": item['unit_price'],
                    "quantity": item['quantity'],
                    "total_price": item['total_price']
                })

            # 7. Update quotation status and total_amount
            update_sql = "UPDATE quotations SET total_amount = %s, status = 'quoted' WHERE id = %s"
            cursor.execute(update_sql, (total_amount, quotation_id))

            # 8. Create notification for the customer
            notif_sql = """
                INSERT INTO notifications (user_id, title, message, is_read)
                VALUES (%s, %s, %s, FALSE)
            """
            notif_title = "Quotation Response Received"
            notif_message = f"{quotation['venue_name']} provided a quotation of ₹{total_amount} for your event on {quotation['event_date']}."
            cursor.execute(notif_sql, (quotation['customer_id'], notif_title, notif_message))

        # Commit transaction
        connection.commit()

        return jsonify({
            "status": "success",
            "message": "Quotation created successfully",
            "data": {
                "quotation_id": quotation_id,
                "status": "quoted",
                "total_amount": total_amount,
                "items": inserted_items
            }
        }), 200

    except Exception as e:
        if connection:
            connection.rollback()
        return jsonify({
            "status": "error",
            "message": "An error occurred while creating the quotation response"
        }), 500
    finally:
        if connection:
            connection.close()


@quotations_bp.route('/quotations/<int:quotation_id>/accept', methods=['POST'])
def accept_quotation(quotation_id):
    """
    Accept Quotation Endpoint (Customer Only)
    POST /api/quotations/<quotation_id>/accept
    """
    # 1. Authenticate user via JWT token
    payload, auth_error = verify_request_token(request)
    if auth_error:
        return jsonify(auth_error[0]), auth_error[1]

    user_id = payload.get('user_id')
    user_role = payload.get('role')

    # 2. Authorize role: Only 'customer' can accept quotations
    if user_role != 'customer':
        return jsonify({
            "status": "error",
            "message": "Access denied. Only customers can accept quotation requests."
        }), 403

    connection = None
    try:
        connection = get_db_connection()
        connection.autocommit(False)
        with connection.cursor() as cursor:
            # 3. Fetch quotation details with venue information
            sql = """
                SELECT q.id, q.customer_id, q.status, q.total_amount,
                       DATE_FORMAT(q.event_date, '%%Y-%%m-%%d') AS event_date,
                       v.name AS venue_name, v.owner_id AS venue_owner_id
                FROM quotations q
                JOIN venues v ON q.venue_id = v.id
                WHERE q.id = %s
            """
            cursor.execute(sql, (quotation_id,))
            quotation = cursor.fetchone()

            if not quotation:
                connection.rollback()
                return jsonify({
                    "status": "error",
                    "message": "Quotation request not found"
                }), 404

            # 4. Verify ownership: Customer must be the original requester
            if quotation['customer_id'] != user_id:
                connection.rollback()
                return jsonify({
                    "status": "error",
                    "message": "Access denied. You do not own this quotation request."
                }), 403

            # 5. Status check: Must be 'quoted'
            if quotation['status'] != 'quoted':
                connection.rollback()
                return jsonify({
                    "status": "error",
                    "message": f"Cannot accept a quotation with status '{quotation['status']}'"
                }), 400

            # 6. Update status to 'accepted'
            update_sql = "UPDATE quotations SET status = 'accepted' WHERE id = %s"
            cursor.execute(update_sql, (quotation_id,))

            # 7. Create notification for the venue owner
            notif_sql = """
                INSERT INTO notifications (user_id, title, message, is_read)
                VALUES (%s, %s, %s, FALSE)
            """
            notif_title = "Quotation Accepted"
            notif_message = f"Customer accepted your quotation for {quotation['venue_name']} (Event Date: {quotation['event_date']})."
            cursor.execute(notif_sql, (quotation['venue_owner_id'], notif_title, notif_message))

        # Commit transaction atomically
        connection.commit()

        return jsonify({
            "status": "success",
            "message": "Quotation accepted successfully",
            "data": {
                "id": quotation_id,
                "status": "accepted",
                "total_amount": float(quotation['total_amount'])
            }
        }), 200
    except Exception as e:
        if connection:
            connection.rollback()
        return jsonify({
            "status": "error",
            "message": "An error occurred while accepting the quotation"
        }), 500
    finally:
        if connection:
            connection.close()


@quotations_bp.route('/quotations/<int:quotation_id>/reject', methods=['POST'])
def reject_quotation(quotation_id):
    """
    Reject Quotation Endpoint (Customer Only)
    POST /api/quotations/<quotation_id>/reject
    """
    # 1. Authenticate user via JWT token
    payload, auth_error = verify_request_token(request)
    if auth_error:
        return jsonify(auth_error[0]), auth_error[1]

    user_id = payload.get('user_id')
    user_role = payload.get('role')

    # 2. Authorize role: Only 'customer' can reject quotations
    if user_role != 'customer':
        return jsonify({
            "status": "error",
            "message": "Access denied. Only customers can reject quotation requests."
        }), 403

    connection = None
    try:
        connection = get_db_connection()
        connection.autocommit(False)
        with connection.cursor() as cursor:
            # 3. Fetch quotation details with venue information
            sql = """
                SELECT q.id, q.customer_id, q.status, q.total_amount,
                       DATE_FORMAT(q.event_date, '%%Y-%%m-%%d') AS event_date,
                       v.name AS venue_name, v.owner_id AS venue_owner_id
                FROM quotations q
                JOIN venues v ON q.venue_id = v.id
                WHERE q.id = %s
            """
            cursor.execute(sql, (quotation_id,))
            quotation = cursor.fetchone()

            if not quotation:
                connection.rollback()
                return jsonify({
                    "status": "error",
                    "message": "Quotation request not found"
                }), 404

            # 4. Verify ownership: Customer must be the original requester
            if quotation['customer_id'] != user_id:
                connection.rollback()
                return jsonify({
                    "status": "error",
                    "message": "Access denied. You do not own this quotation request."
                }), 403

            # 5. Status check: Must be 'quoted'
            if quotation['status'] != 'quoted':
                connection.rollback()
                return jsonify({
                    "status": "error",
                    "message": f"Cannot reject a quotation with status '{quotation['status']}'"
                }), 400

            # 6. Update status to 'rejected'
            update_sql = "UPDATE quotations SET status = 'rejected' WHERE id = %s"
            cursor.execute(update_sql, (quotation_id,))

            # 7. Create notification for the venue owner
            notif_sql = """
                INSERT INTO notifications (user_id, title, message, is_read)
                VALUES (%s, %s, %s, FALSE)
            """
            notif_title = "Quotation Declined"
            notif_message = f"Customer declined the quotation for {quotation['venue_name']} (Event Date: {quotation['event_date']})."
            cursor.execute(notif_sql, (quotation['venue_owner_id'], notif_title, notif_message))

        # Commit transaction atomically
        connection.commit()

        return jsonify({
            "status": "success",
            "message": "Quotation rejected successfully",
            "data": {
                "id": quotation_id,
                "status": "rejected",
                "total_amount": float(quotation['total_amount'])
            }
        }), 200
    except Exception as e:
        if connection:
            connection.rollback()
        return jsonify({
            "status": "error",
            "message": "An error occurred while rejecting the quotation"
        }), 500
    finally:
        if connection:
            connection.close()

