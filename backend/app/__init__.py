from flask import Flask, jsonify
from flask_cors import CORS
from app.database import get_db_connection
from app.routes.auth import auth_bp
from app.routes.venues import venues_bp
from app.routes.event_types import event_types_bp
from app.routes.facilities import facilities_bp
from app.routes.pricing import pricing_bp
from app.routes.availability import availability_bp
from app.routes.quotations import quotations_bp
from app.routes.bookings import bookings_bp
from app.routes.reviews import reviews_bp
from app.routes.wishlist import wishlist_bp
from app.routes.notifications import notifications_bp
from app.routes.admin import admin_bp


def create_app():
    """
    Application factory function to initialize and configure the Flask app.
    """
    app = Flask(__name__)

    # Enable Cross-Origin Resource Sharing (CORS) for all routes
    CORS(app)

    # Register Blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(venues_bp, url_prefix='/api/venues')
    app.register_blueprint(event_types_bp, url_prefix='/api/event-types')
    app.register_blueprint(facilities_bp, url_prefix='/api/facilities')
    app.register_blueprint(pricing_bp, url_prefix='/api/venues')
    app.register_blueprint(availability_bp, url_prefix='/api/venues')
    app.register_blueprint(quotations_bp, url_prefix='/api')
    app.register_blueprint(bookings_bp, url_prefix='/api')
    app.register_blueprint(reviews_bp, url_prefix='/api')
    app.register_blueprint(wishlist_bp, url_prefix='/api')
    app.register_blueprint(notifications_bp, url_prefix='/api')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')






    # Health check route to verify backend server status
    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({
            "status": "success",
            "message": "VenueHub backend is running"
        }), 200

    # Database connectivity test endpoint
    @app.route('/api/db-test', methods=['GET'])
    def db_test():
        connection = None
        try:
            connection = get_db_connection()
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1 AS result;")
                data = cursor.fetchone()
            return jsonify({
                "status": "success",
                "message": "Database connection successful",
                "data": data
            }), 200
        except Exception as e:
            return jsonify({
                "status": "error",
                "message": "Database connection failed",
                "details": str(e)
            }), 500
        finally:
            if connection:
                connection.close()

    return app

