import datetime
from flask import Blueprint, request, jsonify
from app.database import get_db_connection
from app.auth_utils import verify_request_token

# Create bookings Blueprint
bookings_bp = Blueprint('bookings', __name__)


@bookings_bp.route('/bookings', methods=['POST'])
def create_booking():
    """
    Create Booking from Accepted Quotation Endpoint (Customer Only)
    POST /api/bookings
    """
    # 1. Authenticate user via JWT token
    payload, auth_error = verify_request_token(request)
    if auth_error:
        return jsonify(auth_error[0]), auth_error[1]

    customer_id = payload.get('user_id')
    user_role = payload.get('role')

    # 2. Authorize role: Only 'customer' can create bookings
    if user_role != 'customer':
        return jsonify({
            "status": "error",
            "message": "Access denied. Only customers can create bookings."
        }), 403

    # 3. Parse JSON request body
    data = request.get_json()
    if not data or 'quotation_id' not in data:
        return jsonify({
            "status": "error",
            "message": "quotation_id is required"
        }), 400

    quotation_id = data.get('quotation_id')
    try:
        quotation_id = int(quotation_id)
    except (ValueError, TypeError):
        return jsonify({
            "status": "error",
            "message": "quotation_id must be a valid integer"
        }), 400

    connection = None
    try:
        connection = get_db_connection()
        # Disable autocommit to manage explicit database transaction
        connection.autocommit(False)

        with connection.cursor() as cursor:
            # 4. Check if a booking already exists for this quotation
            check_booking_sql = "SELECT id FROM bookings WHERE quotation_id = %s"
            cursor.execute(check_booking_sql, (quotation_id,))
            existing_booking = cursor.fetchone()

            if existing_booking:
                connection.rollback()
                return jsonify({
                    "status": "error",
                    "message": "A booking has already been created for this accepted quotation"
                }), 400

            # 5. Fetch accepted quotation details
            sql = """
                SELECT id, customer_id, venue_id,
                       DATE_FORMAT(event_date, '%%Y-%%m-%%d') AS event_date,
                       guest_count, total_amount, status
                FROM quotations
                WHERE id = %s
            """
            cursor.execute(sql, (quotation_id,))
            quotation = cursor.fetchone()

            # 6. Verify quotation existence
            if not quotation:
                connection.rollback()
                return jsonify({
                    "status": "error",
                    "message": "Quotation request not found"
                }), 404

            # 7. Verify ownership: Quotation must belong to logged-in customer
            if quotation['customer_id'] != customer_id:
                connection.rollback()
                return jsonify({
                    "status": "error",
                    "message": "Access denied. You do not own this quotation request."
                }), 403

            # 8. Status check: Quotation status MUST be 'accepted'
            if quotation['status'] != 'accepted':
                connection.rollback()
                return jsonify({
                    "status": "error",
                    "message": f"Cannot create booking. Quotation status must be 'accepted', currently '{quotation['status']}'."
                }), 400

            # 9. Verify venue existence, status (approved), and is_active
            venue_sql = "SELECT id, owner_id, name, status, is_active FROM venues WHERE id = %s"
            cursor.execute(venue_sql, (quotation['venue_id'],))
            venue = cursor.fetchone()

            if not venue or venue['status'] != 'approved' or not venue['is_active']:
                connection.rollback()
                return jsonify({
                    "status": "error",
                    "message": "Venue is currently not available for booking"
                }), 400

            # 10. Check availability record for the requested venue and date
            avail_sql = "SELECT status FROM availability WHERE venue_id = %s AND date = %s"
            cursor.execute(avail_sql, (quotation['venue_id'], quotation['event_date']))
            avail = cursor.fetchone()

            if avail and avail['status'] in ('booked', 'blocked'):
                connection.rollback()
                return jsonify({
                    "status": "error",
                    "message": f"Venue is already {avail['status']} on the selected date"
                }), 400

            # 11. Create record in bookings table
            insert_booking_sql = """
                INSERT INTO bookings (customer_id, venue_id, quotation_id, event_date, guest_count, total_amount, advance_paid, status)
                VALUES (%s, %s, %s, %s, %s, %s, 0.00, 'confirmed')
            """
            cursor.execute(insert_booking_sql, (
                customer_id,
                quotation['venue_id'],
                quotation_id,
                quotation['event_date'],
                quotation['guest_count'],
                quotation['total_amount']
            ))
            booking_id = cursor.lastrowid

            # 12. Update/Insert availability record as 'booked'
            upsert_avail_sql = """
                INSERT INTO availability (venue_id, date, status, notes)
                VALUES (%s, %s, 'booked', %s)
                ON DUPLICATE KEY UPDATE status = 'booked'
            """
            note = f"Booked via Quotation #{quotation_id}"
            cursor.execute(upsert_avail_sql, (quotation['venue_id'], quotation['event_date'], note))

            # 13. Create notification for Customer
            cust_notif_sql = """
                INSERT INTO notifications (user_id, title, message, is_read)
                VALUES (%s, %s, %s, FALSE)
            """
            cust_title = "Booking Confirmed!"
            cust_msg = f"Your booking for {venue['name']} on {quotation['event_date']} is confirmed (Total: ₹{float(quotation['total_amount'])})."
            cursor.execute(cust_notif_sql, (customer_id, cust_title, cust_msg))

            # 14. Create notification for Venue Owner
            owner_notif_sql = """
                INSERT INTO notifications (user_id, title, message, is_read)
                VALUES (%s, %s, %s, FALSE)
            """
            owner_title = "New Confirmed Booking"
            owner_msg = f"{venue['name']} has been booked for {quotation['event_date']} ({quotation['guest_count']} guests)."
            cursor.execute(owner_notif_sql, (venue['owner_id'], owner_title, owner_msg))

        # Commit transaction atomically
        connection.commit()

        return jsonify({
            "status": "success",
            "message": "Booking created successfully",
            "data": {
                "id": booking_id,
                "quotation_id": quotation_id,
                "customer_id": customer_id,
                "venue_id": quotation['venue_id'],
                "event_date": quotation['event_date'],
                "guest_count": quotation['guest_count'],
                "total_amount": float(quotation['total_amount']),
                "advance_paid": 0.00,
                "status": "confirmed"
            }
        }), 201

    except Exception as e:
        if connection:
            connection.rollback()
        return jsonify({
            "status": "error",
            "message": "An error occurred while creating the booking"
        }), 500
    finally:
        if connection:
            connection.close()


@bookings_bp.route('/bookings/my', methods=['GET'])
def get_my_bookings():
    """
    Get Logged-in Customer's Booking History Endpoint
    GET /api/bookings/my
    """
    # 1. Authenticate user via JWT token
    payload, auth_error = verify_request_token(request)
    if auth_error:
        return jsonify(auth_error[0]), auth_error[1]

    customer_id = payload.get('user_id')
    user_role = payload.get('role')

    # 2. Authorize role: Only 'customer' can view their booking history
    if user_role != 'customer':
        return jsonify({
            "status": "error",
            "message": "Access denied. Only customers can view their booking history."
        }), 403

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # 3. Fetch customer bookings with venue details
            sql = """
                SELECT b.id, b.quotation_id, b.venue_id, v.name AS venue_name, v.city AS venue_city,
                       DATE_FORMAT(b.event_date, '%%Y-%%m-%%d') AS event_date,
                       b.guest_count, b.total_amount, b.advance_paid, b.status,
                       DATE_FORMAT(b.created_at, '%%Y-%%m-%%d %%H:%%i:%%s') AS created_at,
                       DATE_FORMAT(b.updated_at, '%%Y-%%m-%%d %%H:%%i:%%s') AS updated_at
                FROM bookings b
                JOIN venues v ON b.venue_id = v.id
                WHERE b.customer_id = %s
                ORDER BY b.event_date DESC, b.id DESC
            """
            cursor.execute(sql, (customer_id,))
            bookings = cursor.fetchall()

            # Ensure numeric Decimal fields are converted to float
            for booking in bookings:
                booking['total_amount'] = float(booking['total_amount'])
                booking['advance_paid'] = float(booking['advance_paid'])

        return jsonify({
            "status": "success",
            "data": bookings
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "An error occurred while fetching your booking history"
        }), 500
    finally:
        if connection:
            connection.close()


@bookings_bp.route('/bookings/<int:booking_id>', methods=['GET'])
def get_booking_details(booking_id):
    """
    Get Single Booking Details Endpoint
    GET /api/bookings/<booking_id>
    Accessible by customer who booked it, venue owner of the venue, or admin.
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
            # 2. Fetch booking details with venue owner check
            sql = """
                SELECT b.id, b.quotation_id, b.customer_id, b.venue_id,
                       v.name AS venue_name, v.city AS venue_city, v.owner_id AS venue_owner_id,
                       DATE_FORMAT(b.event_date, '%%Y-%%m-%%d') AS event_date,
                       b.guest_count, b.total_amount, b.advance_paid, b.status,
                       DATE_FORMAT(b.created_at, '%%Y-%%m-%%d %%H:%%i:%%s') AS created_at,
                       DATE_FORMAT(b.updated_at, '%%Y-%%m-%%d %%H:%%i:%%s') AS updated_at
                FROM bookings b
                JOIN venues v ON b.venue_id = v.id
                WHERE b.id = %s
            """
            cursor.execute(sql, (booking_id,))
            booking = cursor.fetchone()

            if not booking:
                return jsonify({
                    "status": "error",
                    "message": "Booking not found"
                }), 404

            # 3. Authorization check: Customer who booked it, Venue owner, or Admin
            if user_role != 'admin' and booking['customer_id'] != user_id and booking['venue_owner_id'] != user_id:
                return jsonify({
                    "status": "error",
                    "message": "Access denied. You do not have permission to view this booking."
                }), 403

            # Remove internal venue_owner_id key from output
            quotation_id = booking.get('quotation_id')
            booking.pop('venue_owner_id', None)

            # Convert DECIMAL fields to float
            booking['total_amount'] = float(booking['total_amount'])
            booking['advance_paid'] = float(booking['advance_paid'])

            # 4. Fetch quotation line items if quotation_id exists
            items = []
            if quotation_id:
                items_sql = """
                    SELECT id, item_name, unit_price, quantity, total_price
                    FROM quotation_items
                    WHERE quotation_id = %s
                    ORDER BY id ASC
                """
                cursor.execute(items_sql, (quotation_id,))
                raw_items = cursor.fetchall()
                for item in raw_items:
                    item['unit_price'] = float(item['unit_price'])
                    item['total_price'] = float(item['total_price'])
                    items.append(item)

            booking['items'] = items

        return jsonify({
            "status": "success",
            "data": booking
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "An error occurred while fetching booking details"
        }), 500
    finally:
        if connection:
            connection.close()


@bookings_bp.route('/venues/<int:venue_id>/bookings', methods=['GET'])
def get_venue_bookings(venue_id):
    """
    Get Bookings for a Specific Venue Endpoint (Venue Owner of that venue or Admin)
    GET /api/venues/<venue_id>/bookings
    """
    # 1. Authenticate user via JWT token
    payload, auth_error = verify_request_token(request)
    if auth_error:
        return jsonify(auth_error[0]), auth_error[1]

    user_id = payload.get('user_id')
    user_role = payload.get('role')

    # 2. Authorize role: Only 'venue_owner' or 'admin' can view venue bookings
    if user_role not in ('venue_owner', 'admin'):
        return jsonify({
            "status": "error",
            "message": "Access denied. Only venue owners and admins can view venue bookings."
        }), 403

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # 3. Verify venue existence and ownership
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

            # 4. Fetch venue bookings joined with customer details
            sql = """
                SELECT b.id, b.quotation_id, b.venue_id, b.customer_id,
                       u.full_name AS customer_name, u.email AS customer_email, u.phone AS customer_phone,
                       DATE_FORMAT(b.event_date, '%%Y-%%m-%%d') AS event_date,
                       b.guest_count, b.total_amount, b.advance_paid, b.status,
                       DATE_FORMAT(b.created_at, '%%Y-%%m-%%d %%H:%%i:%%s') AS created_at,
                       DATE_FORMAT(b.updated_at, '%%Y-%%m-%%d %%H:%%i:%%s') AS updated_at
                FROM bookings b
                JOIN users u ON b.customer_id = u.id
                WHERE b.venue_id = %s
                ORDER BY b.event_date ASC, b.id ASC
            """
            cursor.execute(sql, (venue_id,))
            bookings = cursor.fetchall()

            # Ensure numeric Decimal fields are converted to float
            for booking in bookings:
                booking['total_amount'] = float(booking['total_amount'])
                booking['advance_paid'] = float(booking['advance_paid'])

        return jsonify({
            "status": "success",
            "data": bookings
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "An error occurred while fetching venue bookings"
        }), 500
    finally:
        if connection:
            connection.close()


@bookings_bp.route('/bookings', methods=['GET'])
def get_all_bookings_admin():
    """
    Get All Platform Bookings Endpoint (Admin Only)
    GET /api/bookings
    """
    # 1. Authenticate user via JWT token
    payload, auth_error = verify_request_token(request)
    if auth_error:
        return jsonify(auth_error[0]), auth_error[1]

    user_role = payload.get('role')

    # 2. Authorize role: Only 'admin' can view all platform bookings
    if user_role != 'admin':
        return jsonify({
            "status": "error",
            "message": "Access denied. Only administrators can view all platform bookings."
        }), 403

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # 3. Fetch all bookings joined with customer and venue details
            sql = """
                SELECT b.id, b.quotation_id, b.customer_id,
                       u.full_name AS customer_name, u.email AS customer_email, u.phone AS customer_phone,
                       b.venue_id, v.name AS venue_name, v.city AS venue_city,
                       DATE_FORMAT(b.event_date, '%Y-%m-%d') AS event_date,
                       b.guest_count, b.total_amount, b.advance_paid, b.status,
                       DATE_FORMAT(b.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
                       DATE_FORMAT(b.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
                FROM bookings b
                JOIN users u ON b.customer_id = u.id
                JOIN venues v ON b.venue_id = v.id
                ORDER BY b.created_at DESC, b.id DESC
            """
            cursor.execute(sql)
            bookings = cursor.fetchall()

            # Ensure numeric Decimal fields are converted to float
            for booking in bookings:
                booking['total_amount'] = float(booking['total_amount'])
                booking['advance_paid'] = float(booking['advance_paid'])

        return jsonify({
            "status": "success",
            "data": bookings
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "An error occurred while fetching all platform bookings"
        }), 500
    finally:
        if connection:
            connection.close()




