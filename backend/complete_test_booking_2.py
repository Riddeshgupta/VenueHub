import sys
import os

# Add backend directory to python path
sys.path.insert(0, os.path.dirname(__file__))

from app.database import get_db_connection

def complete_booking_2():
    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # 1. Inspect current state of booking #2
            cursor.execute("SELECT id, status, customer_id, venue_id FROM bookings WHERE id = 2")
            booking = cursor.fetchone()
            print("Current Booking #2 state:", booking)

            if not booking:
                print("Booking #2 not found!")
                return

            if booking['status'] != 'confirmed':
                print(f"Booking #2 status is '{booking['status']}', expected 'confirmed'")

            # 2. Update status to completed
            cursor.execute("UPDATE bookings SET status = 'completed' WHERE id = 2")
            connection.commit()

            # 3. Verify updated state
            cursor.execute("SELECT id, status, customer_id, venue_id FROM bookings WHERE id = 2")
            updated = cursor.fetchone()
            print("Updated Booking #2 state:", updated)

    except Exception as e:
        if connection:
            connection.rollback()
        print("Error updating booking #2:", e)
    finally:
        if connection:
            connection.close()

if __name__ == '__main__':
    complete_booking_2()
