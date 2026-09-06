# VenueHub REST API Documentation

This document provides a comprehensive technical specification of all backend RESTful API endpoints implemented in Flask across 12 application modules.

**Base URL:** `http://127.0.0.1:5000/api`  
**Content-Type:** `application/json`  
**Authentication Header:** `Authorization: Bearer <JWT_TOKEN>`

---

## 1. Authentication Module (`/api/auth`)

### 1.1 Register User Account
* **Method:** `POST`
* **Route:** `/api/auth/register`
* **Auth Required:** Public
* **Purpose:** Registers a new user (`customer` or `venue_owner`).
* **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "full_name": "John Doe",
    "phone": "9876543210",
    "role": "customer"
  }
  ```
* **Response (201 Created):**
  ```json
  {
    "status": "success",
    "message": "User registered successfully",
    "data": { "id": 5, "email": "user@example.com", "role": "customer" }
  }
  ```
* **Errors:** `400 Bad Request` (Missing fields / Email exists).

### 1.2 User Login
* **Method:** `POST`
* **Route:** `/api/auth/login`
* **Auth Required:** Public
* **Purpose:** Authenticates credentials and returns a JWT token.
* **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "status": "success",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { "id": 5, "full_name": "John Doe", "email": "user@example.com", "role": "customer" }
  }
  ```
* **Errors:** `401 Unauthorized` (Invalid credentials / Inactive account).

### 1.3 Get Current Profile
* **Method:** `GET`
* **Route:** `/api/auth/me`
* **Auth Required:** Yes (`customer`, `venue_owner`, `admin`)
* **Purpose:** Fetches current authenticated user details.
* **Response (200 OK):** Returns user profile JSON.

---

## 2. Venues Module (`/api/venues`)

### 2.1 Get Public Active Venues
* **Method:** `GET`
* **Route:** `/api/venues`
* **Auth Required:** Public
* **Purpose:** Retrieves all active and approved venues with search filter support.
* **Query Parameters:** `city`, `capacity`, `event_type_id`, `max_price`
* **Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": 1,
        "name": "Royal Palace Banquet",
        "city": "Bhilwara",
        "capacity_min": 50,
        "capacity_max": 500,
        "base_price": "100000.00",
        "primary_image": "https://..."
      }
    ]
  }
  ```

### 2.2 Get Venue Details
* **Method:** `GET`
* **Route:** `/api/venues/<id>`
* **Auth Required:** Public
* **Purpose:** Fetches venue profile, gallery images, assigned facilities, event types, pricing, and reviews.
* **Response (200 OK):** Returns nested venue detail object.

### 2.3 Create Venue Listing
* **Method:** `POST`
* **Route:** `/api/venues`
* **Auth Required:** Yes (`venue_owner`, `admin`)
* **Purpose:** Creates a new venue listing in `pending` approval status.
* **Request Body:** Name, description, address, city, capacity, base price.

---

## 3. Event Types Module (`/api/event-types`)

### 3.1 Get All Event Types
* **Method:** `GET`
* **Route:** `/api/event-types`
* **Auth Required:** Public
* **Purpose:** Returns master list of supported event types (Wedding, Birthday, Corporate).

---

## 4. Facilities Module (`/api/facilities`)

### 4.1 Get All Facilities
* **Method:** `GET`
* **Route:** `/api/facilities`
* **Auth Required:** Public
* **Purpose:** Returns master list of venue amenities (AC, Parking, Catering, DJ).

---

## 5. Pricing Module (`/api/pricing`)

### 5.1 Add Venue Pricing Component
* **Method:** `POST`
* **Route:** `/api/venues/<venue_id>/pricing`
* **Auth Required:** Yes (`venue_owner`, `admin`)
* **Purpose:** Adds a pricing rule (`venue_rental`, `food_per_person`, `decoration`, etc.).

---

## 6. Availability Module (`/api/availability`)

### 6.1 Get Venue Availability Calendar
* **Method:** `GET`
* **Route:** `/api/venues/<venue_id>/availability`
* **Auth Required:** Public
* **Purpose:** Returns date availability records (`available`, `booked`, `blocked`) for a venue.

### 6.2 Set Date Availability / Blockage
* **Method:** `POST`
* **Route:** `/api/venues/<venue_id>/availability`
* **Auth Required:** Yes (`venue_owner`, `admin`)
* **Purpose:** Marks specific date as `available` or `blocked`.

---

## 7. Quotations Module (`/api/quotations`)

### 7.1 Request Quotation
* **Method:** `POST`
* **Route:** `/api/quotations`
* **Auth Required:** Yes (`customer`)
* **Purpose:** Creates a quotation request (`pending`).
* **Request Body:** `venue_id`, `event_type_id`, `event_date`, `guest_count`, `message`

### 7.2 Get Customer Quotations
* **Method:** `GET`
* **Route:** `/api/quotations/my`
* **Auth Required:** Yes (`customer`)
* **Purpose:** Fetches all quotation requests submitted by the logged-in customer.

### 7.3 Get Owner Venue Quotations
* **Method:** `GET`
* **Route:** `/api/venues/<venue_id>/quotations`
* **Auth Required:** Yes (`venue_owner` of that venue, `admin`)
* **Purpose:** Fetches incoming quotation inquiries for a venue.

### 7.4 Owner Respond with Quotation
* **Method:** `POST`
* **Route:** `/api/quotations/<id>/quote`
* **Auth Required:** Yes (`venue_owner`, `admin`)
* **Purpose:** Provides itemized breakdown (`items` array: `item_name`, `unit_price`, `quantity`) and sets status to `quoted`.

### 7.5 Customer Accept Quotation
* **Method:** `POST`
* **Route:** `/api/quotations/<id>/accept`
* **Auth Required:** Yes (`customer`)
* **Purpose:** Accepts quotation proposal (`accepted`).

### 7.6 Customer Reject Quotation
* **Method:** `POST`
* **Route:** `/api/quotations/<id>/reject`
* **Auth Required:** Yes (`customer`)
* **Purpose:** Rejects quotation proposal (`rejected`).

---

## 8. Bookings Module (`/api/bookings`)

### 8.1 Create Booking from Accepted Quotation
* **Method:** `POST`
* **Route:** `/api/bookings`
* **Auth Required:** Yes (`customer`)
* **Purpose:** Converts accepted quotation to confirmed booking (`confirmed`) and automatically updates availability calendar date to `booked`.
* **Request Body:** `{ "quotation_id": 8 }`

### 8.2 Get Customer Bookings
* **Method:** `GET`
* **Route:** `/api/bookings/my`
* **Auth Required:** Yes (`customer`)
* **Purpose:** Lists bookings for the logged-in customer.

### 8.3 Get Owner Venue Bookings
* **Method:** `GET`
* **Route:** `/api/venues/<venue_id>/bookings`
* **Auth Required:** Yes (`venue_owner`, `admin`)
* **Purpose:** Lists bookings for a specific venue.

---

## 9. Reviews Module (`/api/reviews`)

### 9.1 Submit Customer Review
* **Method:** `POST`
* **Route:** `/api/reviews`
* **Auth Required:** Yes (`customer`)
* **Purpose:** Posts a 1–5 star rating and comment for a `completed` booking.
* **Request Body:** `venue_id`, `booking_id`, `rating`, `comment`

---

## 10. Wishlist Module (`/api/wishlist`)

### 10.1 Add Venue to Wishlist
* **Method:** `POST`
* **Route:** `/api/wishlist`
* **Auth Required:** Yes (`customer`)
* **Purpose:** Saves venue bookmark (`201 Created` or `409 Conflict` if duplicate).

### 10.2 Get Customer Wishlist
* **Method:** `GET`
* **Route:** `/api/wishlist/my`
* **Auth Required:** Yes (`customer`)
* **Purpose:** Lists saved venues for the customer.

### 10.3 Delete Wishlist Item
* **Method:** `DELETE`
* **Route:** `/api/wishlist/<venue_id>`
* **Auth Required:** Yes (`customer`)
* **Purpose:** Removes venue from customer wishlist.

---

## 11. Notifications Module (`/api/notifications`)

### 11.1 Get Notifications
* **Method:** `GET`
* **Route:** `/api/notifications`
* **Auth Required:** Yes (All Roles)
* **Purpose:** Fetches notifications log.

### 11.2 Get Unread Count
* **Method:** `GET`
* **Route:** `/api/notifications/unread-count`
* **Auth Required:** Yes (All Roles)
* **Purpose:** Returns unread counter integer.

### 11.3 Mark Notification Read
* **Method:** `PUT`
* **Route:** `/api/notifications/<id>/read`
* **Auth Required:** Yes (All Roles)
* **Purpose:** Marks specific notification as read.

### 11.4 Mark All Notifications Read
* **Method:** `PUT`
* **Route:** `/api/notifications/read-all`
* **Auth Required:** Yes (All Roles)
* **Purpose:** Sets `is_read = TRUE` for all user notifications.

---

## 12. Admin Module (`/api/admin`)

### 12.1 Get Admin Dashboard Stats
* **Method:** `GET`
* **Route:** `/api/admin/stats`
* **Auth Required:** Yes (`admin`)
* **Purpose:** Returns platform counts (users, venues, quotations, bookings, reviews).

### 12.2 Update Venue Approval Status
* **Method:** `PUT`
* **Route:** `/api/admin/venues/<id>/status`
* **Auth Required:** Yes (`admin`)
* **Purpose:** Approves or rejects venue listings (`status = 'approved' | 'rejected'`).

### 12.3 Toggle Venue Active State
* **Method:** `PUT`
* **Route:** `/api/admin/venues/<id>/active`
* **Auth Required:** Yes (`admin`)
* **Purpose:** Enables or disables venue public visibility (`is_active = TRUE | FALSE`).

### 12.4 Manage Users List & Status
* **Method:** `GET` / `PUT`
* **Route:** `/api/admin/users` / `/api/admin/users/<id>/status`
* **Auth Required:** Yes (`admin`)
* **Purpose:** Fetches all users and manages account status (`active` | `inactive`).
