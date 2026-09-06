# VenueHub Security Architecture & Hardening Specification

This document details the security design, token authentication flow, role authorization guards, data isolation controls, and input validation mechanisms implemented within **VenueHub**.

---

## 1. Authentication Security

### 1.1 Password Hashing with bcrypt
* **Implementation:** User passwords are never stored in plaintext. During registration (`POST /api/auth/register`), the backend hashes passwords using `bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())`.
* **Verification:** During login (`POST /api/auth/login`), credentials are verified via `bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8'))`.

### 1.2 Stateless JSON Web Token (JWT) Authentication
* **Token Issuance:** Upon successful authentication, the backend generates a signed JWT using `jwt.encode()` containing:
  * `user_id`: Integer primary key of the user.
  * `email`: User email address.
  * `role`: Assigned user role (`customer`, `venue_owner`, or `admin`).
  * `exp`: Expiration timestamp.
* **Token Verification:** Protected API endpoints invoke `verify_request_token(request)` middleware, which extracts the `Authorization: Bearer <token>` header, decodes the signature using `JWT_SECRET_KEY`, checks token expiration, and returns the verified user payload. Missing or invalid tokens return `401 Unauthorized`.

---

## 2. Role-Based Access Control (RBAC)

The backend enforces strict role-based permission checks at the route controller level:

| Route Path Prefix | Permitted Roles | Unauthorized Action Response |
| :--- | :--- | :--- |
| `/api/admin/*` | `admin` | `403 Forbidden` |
| `/api/owner/*`, `/api/venues/<id>/quotations` | `venue_owner` (owner of venue), `admin` | `403 Forbidden` |
| `/api/quotations` (POST), `/api/bookings` (POST), `/api/wishlist` | `customer` | `403 Forbidden` |
| `/api/reviews` (POST) | `customer` (with completed booking) | `403 Forbidden` / `400 Bad Request` |

---

## 3. Data Isolation & Ownership Validation

1. **Venue Owner Resource Protection:**
   * Venue owners can only edit venues, manage availability, and respond to quotations for venues where `venues.owner_id == user_id`.
   * Unauthenticated or cross-owner update attempts return `403 Forbidden` ("Access denied. You do not own this venue.").

2. **Customer Privacy Isolation:**
   * Customers can only access their own quotations (`/api/quotations/my`), bookings (`/api/bookings/my`), wishlist items (`/api/wishlist/my`), and notifications (`/api/notifications`).
   * Notifications belonging to User A cannot be read or modified by User B (returns `404 Not Found`).

---

## 4. Input Validation & Data Integrity

1. **SQL Injection Prevention:**
   * All database queries use parameterized SQL execution (`cursor.execute(sql, params)`) via PyMySQL. Raw string concatenation of untrusted input is strictly prohibited.

2. **Duplicate Wishlist & Booking Protection:**
   * **Wishlist:** Enforced by database unique constraint `uk_customer_venue (customer_id, venue_id)`. Duplicate additions return `409 Conflict`.
   * **Availability Date Locking:** Booking creation checks if the date status is `booked` or `blocked` in the `availability` table. Schedule conflicts return an error and prevent double reservations.

3. **Verified Review Constraint:**
   * Review submission validates that the customer possesses a booking record with `status = 'completed'` for that venue, and checks that `booking_id` has not already submitted a review.

4. **Rating Boundary Limits:**
   * Reviews enforce `1 <= rating <= 5`. Rating values outside this range are rejected with `400 Bad Request`.

---

## 5. Scope Boundaries

To maintain factual accuracy, the following security features are **Out of Scope** for the current release and documented as potential future enhancements:
* Third-party OAuth 2.0 social sign-in.
* Automated IP rate limiting / DDoS mitigation middleware.
* Integrated credit card payment security (PCI-DSS compliance).
* End-to-end encrypted messaging channels.
