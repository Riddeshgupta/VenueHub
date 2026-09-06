import datetime
from flask import Blueprint, request, jsonify
from app.database import get_db_connection
from app.auth_utils import verify_request_token

# Create venues Blueprint
venues_bp = Blueprint('venues', __name__)


@venues_bp.route('', methods=['GET'])
@venues_bp.route('/', methods=['GET'])
def get_venues():
    """
    Get All Approved & Active Public Venues Endpoint
    GET /api/venues
    """
    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            sql = """
                SELECT id, owner_id, name, description, address, city, state, pincode,
                       capacity_min, capacity_max, base_price, status, is_active,
                       DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at
                FROM venues
                WHERE status = 'approved' AND is_active = TRUE
                ORDER BY name ASC
            """
            cursor.execute(sql)
            venues = cursor.fetchall()

            for venue in venues:
                if venue.get('base_price') is not None:
                    venue['base_price'] = float(venue['base_price'])

        return jsonify({
            "status": "success",
            "data": venues
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "An error occurred while fetching venues"
        }), 500
    finally:
        if connection:
            connection.close()


@venues_bp.route('/search', methods=['GET'])
def search_venues():
    """
    Search and Filter Approved & Active Public Venues Endpoint
    GET /api/venues/search
    Query parameters:
    - city: string (case-insensitive substring match)
    - event_type_id: integer
    - event_date: YYYY-MM-DD string
    - guest_count: positive integer
    - max_budget: positive number
    """
    city_raw = request.args.get('city')
    event_type_id_raw = request.args.get('event_type_id')
    event_date_raw = request.args.get('event_date')
    guest_count_raw = request.args.get('guest_count')
    max_budget_raw = request.args.get('max_budget')

    filters_applied = {}
    where_clauses = ["v.status = 'approved'", "v.is_active = TRUE"]
    params = []

    # 1. City Filter
    if city_raw is not None and city_raw.strip():
        city = city_raw.strip()
        filters_applied['city'] = city
        where_clauses.append("LOWER(v.city) LIKE LOWER(%s)")
        params.append(f"%{city}%")

    # 2. Event Type Filter
    if event_type_id_raw is not None and event_type_id_raw.strip():
        try:
            event_type_id = int(event_type_id_raw.strip())
            if event_type_id <= 0:
                raise ValueError()
        except (ValueError, TypeError):
            return jsonify({
                "status": "error",
                "message": "event_type_id must be a positive integer"
            }), 400
        filters_applied['event_type_id'] = event_type_id
        where_clauses.append("""
            EXISTS (
                SELECT 1 FROM venue_event_types vet
                WHERE vet.venue_id = v.id AND vet.event_type_id = %s
            )
        """)
        params.append(event_type_id)

    # 3. Guest Count Filter
    if guest_count_raw is not None and guest_count_raw.strip():
        try:
            guest_count = int(guest_count_raw.strip())
            if guest_count <= 0:
                raise ValueError()
        except (ValueError, TypeError):
            return jsonify({
                "status": "error",
                "message": "guest_count must be a positive integer"
            }), 400
        filters_applied['guest_count'] = guest_count
        where_clauses.append("v.capacity_min <= %s AND v.capacity_max >= %s")
        params.append(guest_count)
        params.append(guest_count)

    # 4. Maximum Budget Filter
    if max_budget_raw is not None and max_budget_raw.strip():
        try:
            max_budget = float(max_budget_raw.strip())
            if max_budget <= 0:
                raise ValueError()
        except (ValueError, TypeError):
            return jsonify({
                "status": "error",
                "message": "max_budget must be a positive number"
            }), 400
        filters_applied['max_budget'] = int(max_budget) if max_budget.is_integer() else max_budget
        where_clauses.append("v.base_price <= %s")
        params.append(max_budget)

    # 5. Event Date Availability Filter
    if event_date_raw is not None and event_date_raw.strip():
        event_date = event_date_raw.strip()
        try:
            datetime.datetime.strptime(event_date, '%Y-%m-%d')
        except (ValueError, TypeError):
            return jsonify({
                "status": "error",
                "message": "event_date must be in YYYY-MM-DD format"
            }), 400
        filters_applied['event_date'] = event_date
        where_clauses.append("""
            NOT EXISTS (
                SELECT 1 FROM availability a
                WHERE a.venue_id = v.id AND a.date = %s AND a.status IN ('booked', 'blocked')
            )
        """)
        where_clauses.append("""
            NOT EXISTS (
                SELECT 1 FROM bookings b
                WHERE b.venue_id = v.id AND b.event_date = %s AND b.status = 'confirmed'
            )
        """)
        params.append(event_date)
        params.append(event_date)

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            sql = f"""
                SELECT v.id, v.owner_id, v.name, v.description, v.address, v.city, v.state, v.pincode,
                       v.capacity_min, v.capacity_max, v.base_price, v.status, v.is_active,
                       DATE_FORMAT(v.created_at, '%%Y-%%m-%%d %%H:%%i:%%s') AS created_at
                FROM venues v
                WHERE {" AND ".join(where_clauses)}
                ORDER BY v.name ASC
            """
            cursor.execute(sql, tuple(params))
            venues = cursor.fetchall()

            for venue in venues:
                if venue.get('base_price') is not None:
                    venue['base_price'] = float(venue['base_price'])

        return jsonify({
            "status": "success",
            "count": len(venues),
            "filters_applied": filters_applied,
            "data": venues
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "An error occurred while searching venues"
        }), 500
    finally:
        if connection:
            connection.close()


@venues_bp.route('/my', methods=['GET'])
def get_my_venues():
    """
    Get Logged-in Venue Owner's Venues Endpoint
    GET /api/venues/my
    """
    payload, auth_error = verify_request_token(request)
    if auth_error:
        return jsonify(auth_error[0]), auth_error[1]

    owner_id = payload.get('user_id')
    user_role = payload.get('role')

    if user_role != 'venue_owner':
        return jsonify({
            "status": "error",
            "message": "Access denied. Only venue owners can view their venues."
        }), 403

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            sql = """
                SELECT id, owner_id, name, description, address, city, state, pincode,
                       capacity_min, capacity_max, base_price, status, is_active,
                       DATE_FORMAT(created_at, '%%Y-%%m-%%d %%H:%%i:%%s') AS created_at
                FROM venues
                WHERE owner_id = %s
                ORDER BY created_at DESC, id DESC
            """
            cursor.execute(sql, (owner_id,))
            venues = cursor.fetchall()

            for venue in venues:
                if venue.get('base_price') is not None:
                    venue['base_price'] = float(venue['base_price'])

        return jsonify({
            "status": "success",
            "data": venues
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "An error occurred while fetching your venues"
        }), 500
    finally:
        if connection:
            connection.close()


@venues_bp.route('', methods=['POST'])
@venues_bp.route('/', methods=['POST'])
def create_venue():
    """
    Create Venue Endpoint (Venue Owner Only)
    POST /api/venues
    """
    # 1. Authenticate user via JWT token
    payload, auth_error = verify_request_token(request)
    if auth_error:
        return jsonify(auth_error[0]), auth_error[1]

    # 2. Authorize role: Only 'venue_owner' can create venues
    user_role = payload.get('role')
    if user_role != 'venue_owner':
        return jsonify({
            "status": "error",
            "message": "Access denied. Only venue owners can create venue listings."
        }), 403

    # 3. Obtain owner_id strictly from the authenticated JWT payload
    owner_id = payload.get('user_id')

    # 4. Parse request JSON payload
    data = request.get_json()
    if not data:
        return jsonify({
            "status": "error",
            "message": "Request body must be valid JSON"
        }), 400

    name = data.get('name', '').strip() if data.get('name') else ''
    description = data.get('description', '').strip() if data.get('description') else None
    address = data.get('address', '').strip() if data.get('address') else ''
    city = data.get('city', '').strip() if data.get('city') else ''
    state = data.get('state', '').strip() if data.get('state') else ''
    pincode = data.get('pincode', '').strip() if data.get('pincode') else None

    # 5. Required fields check
    if not name or not address or not city or not state:
        return jsonify({
            "status": "error",
            "message": "name, address, city, and state are required fields"
        }), 400

    if 'capacity_max' not in data or data.get('capacity_max') is None:
        return jsonify({
            "status": "error",
            "message": "capacity_max is required"
        }), 400

    if 'base_price' not in data or data.get('base_price') is None:
        return jsonify({
            "status": "error",
            "message": "base_price is required"
        }), 400

    # 6. Numeric fields validation
    try:
        capacity_min = int(data.get('capacity_min', 0))
        capacity_max = int(data.get('capacity_max'))
        base_price = float(data.get('base_price'))
    except (ValueError, TypeError):
        return jsonify({
            "status": "error",
            "message": "capacity_min, capacity_max, and base_price must be valid numbers"
        }), 400

    if capacity_min < 0:
        return jsonify({
            "status": "error",
            "message": "capacity_min must not be negative"
        }), 400

    if capacity_max <= capacity_min:
        return jsonify({
            "status": "error",
            "message": "capacity_max must be greater than capacity_min"
        }), 400

    if base_price < 0:
        return jsonify({
            "status": "error",
            "message": "base_price must not be negative"
        }), 400

    # 7. Insert venue into database using parameterized query
    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            sql = """
                INSERT INTO venues (
                    owner_id, name, description, address, city, state, pincode,
                    capacity_min, capacity_max, base_price, status, is_active
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'pending', TRUE)
            """
            cursor.execute(sql, (
                owner_id, name, description, address, city, state, pincode,
                capacity_min, capacity_max, base_price
            ))
            venue_id = cursor.lastrowid

            # Link event types if provided
            event_type_ids = data.get('event_type_ids')
            if isinstance(event_type_ids, list) and len(event_type_ids) > 0:
                clean_et_ids = list(set([int(et_id) for et_id in event_type_ids if str(et_id).isdigit()]))
                if clean_et_ids:
                    insert_et_sql = "INSERT INTO venue_event_types (venue_id, event_type_id) VALUES (%s, %s)"
                    cursor.executemany(insert_et_sql, [(venue_id, et_id) for et_id in clean_et_ids])

            # Link facilities if provided
            facility_ids = data.get('facility_ids')
            if isinstance(facility_ids, list) and len(facility_ids) > 0:
                clean_f_ids = list(set([int(f_id) for f_id in facility_ids if str(f_id).isdigit()]))
                if clean_f_ids:
                    insert_f_sql = "INSERT INTO venue_facilities (venue_id, facility_id) VALUES (%s, %s)"
                    cursor.executemany(insert_f_sql, [(venue_id, f_id) for f_id in clean_f_ids])

        # 8. Return HTTP 201 Created with safe venue summary
        return jsonify({
            "status": "success",
            "message": "Venue created successfully and is pending approval",
            "data": {
                "id": venue_id,
                "name": name,
                "owner_id": owner_id,
                "status": "pending",
                "is_active": True
            }
        }), 201

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "An error occurred while creating the venue"
        }), 500
    finally:
        if connection:
            connection.close()


@venues_bp.route('/<int:venue_id>/event-types', methods=['POST', 'PUT'])
def assign_event_types(venue_id):
    """
    Assign Event Types to Venue Endpoint (Venue Owner or Admin)
    POST/PUT /api/venues/<venue_id>/event-types
    """
    # 1. Authenticate user via JWT token
    payload, auth_error = verify_request_token(request)
    if auth_error:
        return jsonify(auth_error[0]), auth_error[1]

    user_id = payload.get('user_id')
    user_role = payload.get('role')

    # 2. Parse request JSON payload
    data = request.get_json()
    if not data or 'event_type_ids' not in data:
        return jsonify({
            "status": "error",
            "message": "event_type_ids array is required"
        }), 400

    event_type_ids = data.get('event_type_ids')
    if not isinstance(event_type_ids, list):
        return jsonify({
            "status": "error",
            "message": "event_type_ids must be a list of integers"
        }), 400

    # Clean and deduplicate IDs
    unique_ids = list(set([int(et_id) for et_id in event_type_ids if isinstance(et_id, (int, str)) and str(et_id).isdigit()]))

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # 3. Check venue existence and ownership
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

            # 4. Verify all provided event_type_ids exist in event_types table
            if unique_ids:
                format_strings = ','.join(['%s'] * len(unique_ids))
                check_et_sql = f"SELECT id FROM event_types WHERE id IN ({format_strings})"
                cursor.execute(check_et_sql, tuple(unique_ids))
                found_ets = cursor.fetchall()
                if len(found_ets) != len(unique_ids):
                    return jsonify({
                        "status": "error",
                        "message": "One or more event type IDs are invalid"
                    }), 400

            # 5. Clear existing event types for this venue and re-insert new list
            delete_sql = "DELETE FROM venue_event_types WHERE venue_id = %s"
            cursor.execute(delete_sql, (venue_id,))

            if unique_ids:
                insert_sql = "INSERT INTO venue_event_types (venue_id, event_type_id) VALUES (%s, %s)"
                insert_tuples = [(venue_id, et_id) for et_id in unique_ids]
                cursor.executemany(insert_sql, insert_tuples)

        return jsonify({
            "status": "success",
            "message": "Event types assigned to venue successfully",
            "data": {
                "venue_id": venue_id,
                "event_type_ids": unique_ids
            }
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "An error occurred while assigning event types to venue"
        }), 500
    finally:
        if connection:
            connection.close()


@venues_bp.route('/<int:venue_id>/facilities', methods=['POST', 'PUT'])
def assign_facilities(venue_id):
    """
    Assign Facilities to Venue Endpoint (Venue Owner or Admin)
    POST/PUT /api/venues/<venue_id>/facilities
    """
    # 1. Authenticate user via JWT token
    payload, auth_error = verify_request_token(request)
    if auth_error:
        return jsonify(auth_error[0]), auth_error[1]

    user_id = payload.get('user_id')
    user_role = payload.get('role')

    # 2. Parse request JSON payload
    data = request.get_json()
    if not data or 'facility_ids' not in data:
        return jsonify({
            "status": "error",
            "message": "facility_ids array is required"
        }), 400

    facility_ids = data.get('facility_ids')
    if not isinstance(facility_ids, list):
        return jsonify({
            "status": "error",
            "message": "facility_ids must be a list of integers"
        }), 400

    # Clean and deduplicate IDs
    unique_ids = list(set([int(f_id) for f_id in facility_ids if isinstance(f_id, (int, str)) and str(f_id).isdigit()]))

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # 3. Check venue existence and ownership
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

            # 4. Verify all provided facility_ids exist in facilities table
            if unique_ids:
                format_strings = ','.join(['%s'] * len(unique_ids))
                check_fac_sql = f"SELECT id FROM facilities WHERE id IN ({format_strings})"
                cursor.execute(check_fac_sql, tuple(unique_ids))
                found_facs = cursor.fetchall()
                if len(found_facs) != len(unique_ids):
                    return jsonify({
                        "status": "error",
                        "message": "One or more facility IDs are invalid"
                    }), 400

            # 5. Clear existing facilities for this venue and re-insert new list
            delete_sql = "DELETE FROM venue_facilities WHERE venue_id = %s"
            cursor.execute(delete_sql, (venue_id,))

            if unique_ids:
                insert_sql = "INSERT INTO venue_facilities (venue_id, facility_id) VALUES (%s, %s)"
                insert_tuples = [(venue_id, f_id) for f_id in unique_ids]
                cursor.executemany(insert_sql, insert_tuples)

        return jsonify({
            "status": "success",
            "message": "Facilities assigned to venue successfully",
            "data": {
                "venue_id": venue_id,
                "facility_ids": unique_ids
            }
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "An error occurred while assigning facilities to venue"
        }), 500
    finally:
        if connection:
            connection.close()


@venues_bp.route('/<int:venue_id>', methods=['GET'])
@venues_bp.route('/<int:venue_id>/details', methods=['GET'])
def get_venue_details(venue_id):
    """
    Get Venue Details Endpoint (Public)
    GET /api/venues/<venue_id>/details
    Returns basic venue information, assigned event types, and facilities.
    """
    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # 1. Fetch basic venue information
            venue_sql = """
                SELECT id, owner_id, name, description, address, city, state, pincode,
                       capacity_min, capacity_max, base_price, status, is_active, created_at
                FROM venues WHERE id = %s
            """
            cursor.execute(venue_sql, (venue_id,))
            venue = cursor.fetchone()

            if not venue:
                return jsonify({
                    "status": "error",
                    "message": "Venue not found"
                }), 404

            # 2. Fetch assigned event types
            et_sql = """
                SELECT et.id, et.name, et.description
                FROM event_types et
                JOIN venue_event_types vet ON et.id = vet.event_type_id
                WHERE vet.venue_id = %s
                ORDER BY et.name ASC
            """
            cursor.execute(et_sql, (venue_id,))
            event_types = cursor.fetchall()

            # 3. Fetch assigned facilities
            fac_sql = """
                SELECT f.id, f.name, f.icon
                FROM facilities f
                JOIN venue_facilities vf ON f.id = vf.facility_id
                WHERE vf.venue_id = %s
                ORDER BY f.name ASC
            """
            cursor.execute(fac_sql, (venue_id,))
            facilities = cursor.fetchall()

        return jsonify({
            "status": "success",
            "data": {
                "venue": venue,
                "event_types": event_types,
                "facilities": facilities
            }
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "An error occurred while fetching venue details"
        }), 500
    finally:
        if connection:
            connection.close()


@venues_bp.route('/<int:venue_id>', methods=['PUT'])
def update_venue(venue_id):
    """
    Update Venue Details Endpoint (Venue Owner or Admin)
    PUT /api/venues/<venue_id>
    """
    payload, auth_error = verify_request_token(request)
    if auth_error:
        return jsonify(auth_error[0]), auth_error[1]

    user_id = payload.get('user_id')
    user_role = payload.get('role')

    if user_role not in ('venue_owner', 'admin'):
        return jsonify({
            "status": "error",
            "message": "Access denied. Only venue owners can update venue details."
        }), 403

    data = request.get_json()
    if not data:
        return jsonify({
            "status": "error",
            "message": "Request body must be valid JSON"
        }), 400

    name = data.get('name', '').strip() if data.get('name') else ''
    description = data.get('description', '').strip() if data.get('description') else None
    address = data.get('address', '').strip() if data.get('address') else ''
    city = data.get('city', '').strip() if data.get('city') else ''
    state = data.get('state', '').strip() if data.get('state') else ''
    pincode = data.get('pincode', '').strip() if data.get('pincode') else None

    if not name or not address or not city or not state:
        return jsonify({
            "status": "error",
            "message": "name, address, city, and state are required fields"
        }), 400

    try:
        capacity_min = int(data.get('capacity_min', 0))
        capacity_max = int(data.get('capacity_max'))
        base_price = float(data.get('base_price'))
    except (ValueError, TypeError):
        return jsonify({
            "status": "error",
            "message": "capacity_min, capacity_max, and base_price must be valid numbers"
        }), 400

    if capacity_min < 0:
        return jsonify({
            "status": "error",
            "message": "capacity_min must not be negative"
        }), 400

    if capacity_max <= capacity_min:
        return jsonify({
            "status": "error",
            "message": "capacity_max must be greater than capacity_min"
        }), 400

    if base_price < 0:
        return jsonify({
            "status": "error",
            "message": "base_price must not be negative"
        }), 400

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # Check ownership
            check_sql = "SELECT id, owner_id FROM venues WHERE id = %s"
            cursor.execute(check_sql, (venue_id,))
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

            # Update venue table (never change owner_id or status)
            update_sql = """
                UPDATE venues SET
                    name = %s, description = %s, address = %s, city = %s, state = %s, pincode = %s,
                    capacity_min = %s, capacity_max = %s, base_price = %s
                WHERE id = %s
            """
            cursor.execute(update_sql, (
                name, description, address, city, state, pincode,
                capacity_min, capacity_max, base_price, venue_id
            ))

            # Update event types if provided
            event_type_ids = data.get('event_type_ids')
            if isinstance(event_type_ids, list):
                clean_et_ids = list(set([int(et_id) for et_id in event_type_ids if str(et_id).isdigit()]))
                cursor.execute("DELETE FROM venue_event_types WHERE venue_id = %s", (venue_id,))
                if clean_et_ids:
                    cursor.executemany(
                        "INSERT INTO venue_event_types (venue_id, event_type_id) VALUES (%s, %s)",
                        [(venue_id, et_id) for et_id in clean_et_ids]
                    )

            # Update facilities if provided
            facility_ids = data.get('facility_ids')
            if isinstance(facility_ids, list):
                clean_f_ids = list(set([int(f_id) for f_id in facility_ids if str(f_id).isdigit()]))
                cursor.execute("DELETE FROM venue_facilities WHERE venue_id = %s", (venue_id,))
                if clean_f_ids:
                    cursor.executemany(
                        "INSERT INTO venue_facilities (venue_id, facility_id) VALUES (%s, %s)",
                        [(venue_id, f_id) for f_id in clean_f_ids]
                    )

        return jsonify({
            "status": "success",
            "message": "Venue updated successfully",
            "data": {
                "id": venue_id,
                "name": name,
                "description": description,
                "address": address,
                "city": city,
                "state": state,
                "pincode": pincode,
                "capacity_min": capacity_min,
                "capacity_max": capacity_max,
                "base_price": base_price,
                "status": venue.get('status', 'pending')
            }
        }), 200

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "An error occurred while updating the venue"
        }), 500
    finally:
        if connection:
            connection.close()


@venues_bp.route('/<int:venue_id>/status', methods=['PUT'])
def update_venue_status(venue_id):
    """
    Toggle Venue Active/Inactive Status Endpoint (Venue Owner or Admin)
    PUT /api/venues/<venue_id>/status
    Payload: { "is_active": boolean }
    Note: Venue Owner CANNOT change approval status (status column), only is_active!
    """
    payload, auth_error = verify_request_token(request)
    if auth_error:
        return jsonify(auth_error[0]), auth_error[1]

    user_id = payload.get('user_id')
    user_role = payload.get('role')

    if user_role not in ('venue_owner', 'admin'):
        return jsonify({
            "status": "error",
            "message": "Access denied. Only venue owners can modify venue active status."
        }), 403

    data = request.get_json()
    if not data or 'is_active' not in data:
        return jsonify({
            "status": "error",
            "message": "is_active boolean is required"
        }), 400

    is_active = bool(data.get('is_active'))

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            check_sql = "SELECT id, owner_id FROM venues WHERE id = %s"
            cursor.execute(check_sql, (venue_id,))
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

            # Update ONLY is_active column. Never modify status (approval).
            update_sql = "UPDATE venues SET is_active = %s WHERE id = %s"
            cursor.execute(update_sql, (is_active, venue_id))

        return jsonify({
            "status": "success",
            "message": f"Venue marked as {'active' if is_active else 'inactive'}",
            "data": {
                "id": venue_id,
                "is_active": is_active,
                "status": venue.get('status', 'pending')
            }
        }), 200

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "An error occurred while updating venue status"
        }), 500
    finally:
        if connection:
            connection.close()


@venues_bp.route('/<int:venue_id>', methods=['DELETE'])
def delete_venue(venue_id):
    """
    Delete Venue Endpoint (Venue Owner or Admin)
    DELETE /api/venues/<venue_id>
    """
    payload, auth_error = verify_request_token(request)
    if auth_error:
        return jsonify(auth_error[0]), auth_error[1]

    user_id = payload.get('user_id')
    user_role = payload.get('role')

    if user_role not in ('venue_owner', 'admin'):
        return jsonify({
            "status": "error",
            "message": "Access denied. Only venue owners can delete their venues."
        }), 403

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            check_sql = "SELECT id, owner_id FROM venues WHERE id = %s"
            cursor.execute(check_sql, (venue_id,))
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

            # Delete related child records first
            cursor.execute("DELETE FROM venue_event_types WHERE venue_id = %s", (venue_id,))
            cursor.execute("DELETE FROM venue_facilities WHERE venue_id = %s", (venue_id,))
            cursor.execute("DELETE FROM wishlist WHERE venue_id = %s", (venue_id,))
            cursor.execute("DELETE FROM venues WHERE id = %s", (venue_id,))

        return jsonify({
            "status": "success",
            "message": "Venue deleted successfully"
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "An error occurred while deleting the venue"
        }), 500
    finally:
        if connection:
            connection.close()


