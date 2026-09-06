import datetime
from flask import Blueprint, request, jsonify
from app.database import get_db_connection
from app.auth_utils import verify_request_token

# Create notifications Blueprint
notifications_bp = Blueprint('notifications', __name__)


@notifications_bp.route('/notifications', methods=['GET'])
def get_user_notifications():
    """
    Get Logged-in User's Notifications Endpoint
    GET /api/notifications
    """
    # 1. Authenticate user via JWT token
    payload, auth_error = verify_request_token(request)
    if auth_error:
        return jsonify(auth_error[0]), auth_error[1]

    user_id = payload.get('user_id')

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # 2. Fetch notifications for authenticated user
            sql = """
                SELECT id, title, message, is_read,
                       DATE_FORMAT(created_at, '%%Y-%%m-%%d %%H:%%i:%%s') AS created_at
                FROM notifications
                WHERE user_id = %s
                ORDER BY created_at DESC, id DESC
            """
            cursor.execute(sql, (user_id,))
            notifications = cursor.fetchall()

            # Ensure boolean formatting for is_read
            for n in notifications:
                n['is_read'] = bool(n['is_read'])

        return jsonify({
            "status": "success",
            "data": notifications
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "An error occurred while fetching notifications"
        }), 500
    finally:
        if connection:
            connection.close()


@notifications_bp.route('/notifications/unread-count', methods=['GET'])
def get_unread_notification_count():
    """
    Get Unread Notification Count Endpoint
    GET /api/notifications/unread-count
    """
    # 1. Authenticate user via JWT token
    payload, auth_error = verify_request_token(request)
    if auth_error:
        return jsonify(auth_error[0]), auth_error[1]

    user_id = payload.get('user_id')

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # 2. Count unread notifications
            sql = "SELECT COUNT(*) AS unread_count FROM notifications WHERE user_id = %s AND is_read = FALSE"
            cursor.execute(sql, (user_id,))
            result = cursor.fetchone()
            unread_count = int(result['unread_count']) if result and result.get('unread_count') else 0

        return jsonify({
            "status": "success",
            "data": {
                "unread_count": unread_count
            }
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "An error occurred while fetching unread notification count"
        }), 500
    finally:
        if connection:
            connection.close()


@notifications_bp.route('/notifications/<int:notification_id>/read', methods=['PUT'])
def mark_notification_read(notification_id):
    """
    Mark Single Notification as Read Endpoint
    PUT /api/notifications/<notification_id>/read
    """
    # 1. Authenticate user via JWT token
    payload, auth_error = verify_request_token(request)
    if auth_error:
        return jsonify(auth_error[0]), auth_error[1]

    user_id = payload.get('user_id')

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # 2. Check if notification exists and belongs to user
            check_sql = "SELECT id FROM notifications WHERE id = %s AND user_id = %s"
            cursor.execute(check_sql, (notification_id, user_id))
            notification = cursor.fetchone()

            if not notification:
                return jsonify({
                    "status": "error",
                    "message": "Notification not found"
                }), 404

            # 3. Update is_read status
            update_sql = "UPDATE notifications SET is_read = TRUE WHERE id = %s AND user_id = %s"
            cursor.execute(update_sql, (notification_id, user_id))
            connection.commit()

        return jsonify({
            "status": "success",
            "message": "Notification marked as read"
        }), 200
    except Exception as e:
        if connection:
            connection.rollback()
        return jsonify({
            "status": "error",
            "message": "An error occurred while updating notification status"
        }), 500
    finally:
        if connection:
            connection.close()


@notifications_bp.route('/notifications/read-all', methods=['PUT'])
def mark_all_notifications_read():
    """
    Mark All Unread Notifications as Read Endpoint
    PUT /api/notifications/read-all
    """
    # 1. Authenticate user via JWT token
    payload, auth_error = verify_request_token(request)
    if auth_error:
        return jsonify(auth_error[0]), auth_error[1]

    user_id = payload.get('user_id')

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # 2. Update all unread notifications for this user
            update_sql = "UPDATE notifications SET is_read = TRUE WHERE user_id = %s AND is_read = FALSE"
            cursor.execute(update_sql, (user_id,))
            updated_count = cursor.rowcount
            connection.commit()

        return jsonify({
            "status": "success",
            "message": "All notifications marked as read",
            "data": {
                "updated_count": updated_count
            }
        }), 200
    except Exception as e:
        if connection:
            connection.rollback()
        return jsonify({
            "status": "error",
            "message": "An error occurred while marking all notifications as read"
        }), 500
    finally:
        if connection:
            connection.close()
