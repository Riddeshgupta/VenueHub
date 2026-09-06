from app import create_app

# Create the Flask application instance using the factory function
app = create_app()

if __name__ == '__main__':
    # Start the Flask development server on http://127.0.0.1:5000
    app.run(host='127.0.0.1', port=5000, debug=True)
