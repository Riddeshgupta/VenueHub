import sys
from app.database import get_db_connection


def approve_test_venue():
    """
    One-time utility script to update test venue ID 1 status to 'approved'
    for testing quotation requests.
    """
    venue_id = 1
    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # 1. Check if venue ID 1 exists
            check_sql = "SELECT id, name, status, is_active FROM venues WHERE id = %s"
            cursor.execute(check_sql, (venue_id,))
            venue = cursor.fetchone()

            if not venue:
                print(f"[!] Error: Venue with ID {venue_id} was not found.")
                sys.exit(1)

            # 2. Update status to 'approved' using parameterized query
            update_sql = "UPDATE venues SET status = 'approved' WHERE id = %s"
            cursor.execute(update_sql, (venue_id,))

        print("==========================================")
        print("[✓] Venue approved successfully!")
        print(f"    Venue ID   : {venue['id']}")
        print(f"    Venue Name : {venue['name']}")
        print(f"    Old Status : {venue['status']}")
        print(f"    New Status : approved")
        print("==========================================")

    except Exception as e:
        print(f"[!] Error approving venue: {e}")
        sys.exit(1)
    finally:
        if connection:
            connection.close()


if __name__ == '__main__':
    approve_test_venue()
