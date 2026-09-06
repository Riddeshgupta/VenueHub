import datetime
from flask import Blueprint, request, jsonify
from app.database import get_db_connection
from app.auth_utils import verify_request_token

# Create reviews Blueprint
reviews_bp = Blueprint('reviews', __name__)


@reviews_bp.route('/reviews', methods=['POST'])
def submit_review():
    """
    Submit Venue Review Endpoint (Customer Only)
    POST /api/reviews
    """
    # 1. Authenticate user via JWT token
    payload, auth_error = verify_request_token(request)
    if auth_error:
        return jsonify(auth_error[0]), auth_error[1]

    customer_id = payload.get('user_id')
    user_role = payload.get('role')

    # 2. Authorize role: Only 'customer' can submit reviews
    if user_role != 'customer':
        return jsonify({
            "status": "error",
            "message": "Access denied. Only customers can submit venue reviews."
        }), 403

    # 3. Parse JSON request body
    data = request.get_json()
    if not data:
        return jsonify({
            "status": "error",
            "message": "Request body must be valid JSON"
        }), 400

    if 'booking_id' not in data or data.get('booking_id') is None:
        return jsonify({
            "status": "error",
            "message": "booking_id is required"
        }), 400

    if 'rating' not in data or data.get('rating') is None:
        return jsonify({
            "status": "error",
            "message": "rating is required"
        }), 400

    booking_id = data.get('booking_id')
    rating = data.get('rating')
    comment = data.get('comment', '').strip() if data.get('comment') else None

    # 4. Validate types and bounds
    try:
        booking_id = int(booking_id)
        rating = int(rating)
    except (ValueError, TypeError):
        return jsonify({
            "status": "error",
            "message": "booking_id and rating must be valid integers"
        }), 400

    if rating < 1 or rating > 5:
        return jsonify({
            "status": "error",
            "message": "rating must be an integer between 1 and 5"
        }), 400

    connection = None
    try:
        connection = get_db_connection()
        # Disable autocommit to manage explicit database transaction
        connection.autocommit(False)

        with connection.cursor() as cursor:
            # 5. Fetch booking details with venue information
            booking_sql = """
                SELECT b.id, b.customer_id, b.venue_id, b.status,
                       v.name AS venue_name, v.owner_id AS venue_owner_id
                FROM bookings b
                JOIN venues v ON b.venue_id = v.id
                WHERE b.id = %s
            """
            cursor.execute(booking_sql, (booking_id,))
            booking = cursor.fetchone()

            # 6. Verify booking existence
            if not booking:
                connection.rollback()
                return jsonify({
                    "status": "error",
                    "message": "Booking not found"
                }), 404

            # 7. Verify ownership: Booking must belong to logged-in customer
            if booking['customer_id'] != customer_id:
                connection.rollback()
                return jsonify({
                    "status": "error",
                    "message": "Access denied. You do not own this booking."
                }), 403

            # 8. Verify booking status: Must be 'completed'
            if booking['status'] != 'completed':
                connection.rollback()
                return jsonify({
                    "status": "error",
                    "message": f"Reviews can only be submitted for completed bookings. Current booking status is '{booking['status']}'."
                }), 400

            # 9. Check if a review already exists for this booking
            check_review_sql = "SELECT id FROM reviews WHERE booking_id = %s"
            cursor.execute(check_review_sql, (booking_id,))
            existing_review = cursor.fetchone()

            if existing_review:
                connection.rollback()
                return jsonify({
                    "status": "error",
                    "message": "A review has already been submitted for this booking"
                }), 409

            # 10. Insert review record
            insert_sql = """
                INSERT INTO reviews (venue_id, customer_id, booking_id, rating, comment)
                VALUES (%s, %s, %s, %s, %s)
            """
            cursor.execute(insert_sql, (booking['venue_id'], customer_id, booking_id, rating, comment))
            review_id = cursor.lastrowid

            # 11. Create notification for the venue owner
            notif_sql = """
                INSERT INTO notifications (user_id, title, message, is_read)
                VALUES (%s, %s, %s, FALSE)
            """
            notif_title = "New Venue Review"
            notif_message = f"A customer submitted a {rating}-star review for {booking['venue_name']}."
            cursor.execute(notif_sql, (booking['venue_owner_id'], notif_title, notif_message))

        # Commit transaction atomically
        connection.commit()

        return jsonify({
            "status": "success",
            "message": "Review submitted successfully",
            "data": {
                "id": review_id,
                "venue_id": booking['venue_id'],
                "customer_id": customer_id,
                "booking_id": booking_id,
                "rating": rating,
                "comment": comment
            }
        }), 201

    except Exception as e:
        if connection:
            connection.rollback()
        return jsonify({
            "status": "error",
            "message": "An error occurred while submitting the review"
        }), 500
    finally:
        if connection:
            connection.close()


@reviews_bp.route('/venues/<int:venue_id>/reviews', methods=['GET'])
def get_venue_reviews(venue_id):
    """
    Get Public Reviews for a Specific Venue Endpoint (Public)
    GET /api/venues/<venue_id>/reviews
    """
    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # 1. Verify venue existence
            venue_sql = "SELECT id FROM venues WHERE id = %s"
            cursor.execute(venue_sql, (venue_id,))
            venue = cursor.fetchone()

            if not venue:
                return jsonify({
                    "status": "error",
                    "message": "Venue not found"
                }), 404

            # 2. Fetch rating statistics
            stats_sql = """
                SELECT COUNT(*) AS total_reviews, AVG(rating) AS average_rating
                FROM reviews
                WHERE venue_id = %s
            """
            cursor.execute(stats_sql, (venue_id,))
            stats = cursor.fetchone()

            total_reviews = int(stats['total_reviews']) if stats and stats['total_reviews'] else 0
            average_rating = round(float(stats['average_rating']), 1) if stats and stats['average_rating'] is not None else 0.0

            # 3. Fetch individual reviews joined with customer details
            reviews_sql = """
                SELECT r.id, r.customer_id, u.full_name AS customer_name, r.rating, r.comment,
                       DATE_FORMAT(r.created_at, '%%Y-%%m-%%d %%H:%%i:%%s') AS created_at
                FROM reviews r
                JOIN users u ON r.customer_id = u.id
                WHERE r.venue_id = %s
                ORDER BY r.created_at DESC, r.id DESC
            """
            cursor.execute(reviews_sql, (venue_id,))
            reviews = cursor.fetchall()

        return jsonify({
            "status": "success",
            "data": {
                "venue_id": venue_id,
                "average_rating": average_rating,
                "total_reviews": total_reviews,
                "reviews": reviews
            }
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "An error occurred while fetching venue reviews"
        }), 500
    finally:
        if connection:
            connection.close()

