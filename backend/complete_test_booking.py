import sys
import os

# Add backend directory to sys.path to allow app imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import get_db_connection


def complete_test_booking():
    """
    One-time utility script to update Booking ID 1 status to 'completed'
    for testing the venue review workflow.
    """
    booking_id = 1
    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # 1. Find Booking ID 1
            select_sql = "SELECT id, status, quotation_id, venue_id FROM bookings WHERE id = %s"
            cursor.execute(select_sql, (booking_id,))
            booking = cursor.fetchone()

            if not booking:
                print(f"[ERROR] Booking ID {booking_id} not found in database.")
                sys.exit(1)

            old_status = booking['status']
            print(f"[INFO] Found Booking ID: {booking['id']}")
            print(f"[INFO] Venue ID: {booking['venue_id']}")
            print(f"[INFO] Quotation ID: {booking['quotation_id']}")
            print(f"[INFO] Current Status: {old_status}")

            # 2. Update status to 'completed'
            update_sql = "UPDATE bookings SET status = 'completed' WHERE id = %s"
            cursor.execute(update_sql, (booking_id,))
            connection.commit()

            # 3. Verify update
            cursor.execute(select_sql, (booking_id,))
            updated_booking = cursor.fetchone()
            new_status = updated_booking['status']

            print("\n[SUCCESS] Booking status updated successfully!")
            print(f"[SUMMARY] Booking ID {booking_id}: Old Status = '{old_status}', New Status = '{new_status}'")

    except Exception as e:
        if connection:
            connection.rollback()
        print(f"[ERROR] An exception occurred while updating booking: {e}")
        sys.exit(1)
    finally:
        if connection:
            connection.close()


if __name__ == '__main__':
    complete_test_booking()
