# VenueHub: Smart Venue Discovery, Comparison & Event Booking Platform
## Academic Project Documentation

**Project Title:** VenueHub — Smart Venue Discovery, Comparison & Event Booking Platform  
**Tagline:** Discover • Compare • Quote • Book  
**Domain:** Web Application / Software Engineering / Multi-Vendor Marketplace  
**Target Academic Level:** 3rd Year B.Tech Computer Science & Engineering (CSE)  

---

### 1. Title Page Information
* **Project Name:** VenueHub
* **Suggested Title:** Smart Venue Discovery, Comparison & Event Booking Platform
* **Tagline:** Discover • Compare • Quote • Book
* **Technology Stack:**
  * **Frontend:** React (v19), JavaScript (ES6+), Vanilla CSS3, Vite (v8)
  * **Backend:** Python (v3.12), Flask (v3.1), RESTful Web Services
  * **Database:** MySQL (v8.0+), PyMySQL Driver, Relational Schema (InnoDB)
  * **Authentication:** JSON Web Tokens (PyJWT), bcrypt Password Hashing
  * **HTTP Client:** Axios (v1.2)
  * **Version Control:** Git / GitHub

---

### 2. Abstract
Finding suitable event venues for weddings, corporate conferences, birthday celebrations, and social gatherings is traditionally a fragmented and inefficient process. Customers frequently encounter opaque pricing, outdated availability data, limited facility disclosure, and time-consuming manual coordination with venue managers. Simultaneously, venue owners lack streamlined digital tools to showcase property amenities, manage date availability, evaluate incoming quotation requests, and issue itemized pricing proposals.

To resolve these challenges, **VenueHub** is developed as a comprehensive multi-vendor venue marketplace. Built using a modern decoupled web architecture with a React frontend and Flask RESTful API backend, VenueHub bridges the gap between event organizers and venue owners. The platform supports three primary user roles: **Customer**, **Venue Owner**, and **Administrator**. Key capabilities include multi-criteria venue search and filtering, side-by-side venue comparison, custom wishlist management, itemized quotation requesting and response workflows, automatic date availability protection to prevent double bookings, post-event customer review and rating management, real-time user notifications, and administrative platform governance. Security is enforced through JSON Web Token (JWT) authentication, bcrypt password hashing, and strict Role-Based Access Control (RBAC). The resulting system simplifies venue selection, establishes transparent pricing, and automates event booking workflows.

---

### 3. Introduction
Event planning requires identifying, evaluating, and reserving physical venues that accommodate specific guest capacities, budget constraints, geographic preferences, and required amenities. Traditionally, event organizers relied on word-of-mouth recommendations, physical site visits, or generic internet directories that provide static contact details without verified availability or structured pricing.

VenueHub modernizes event venue booking by providing an interactive digital platform. It transforms how customers search, compare, request quotes, and book venues while empowering venue owners with administrative tools to manage listings, set dynamic pricing structures, and respond to custom event inquiries efficiently.

---

### 4. Problem Statement
The conventional venue booking process suffers from multiple systemic pain points:
1. **Fragmented Information:** Event organizers must search multiple disparate websites, social media pages, and physical directories to locate venue options.
2. **Opaque & Unclear Pricing:** Venues rarely disclose complete pricing structures publicly, leading to unexpected costs for catering, decoration, DJ setup, and taxes.
3. **Manual & Slow Quotation Communication:** Obtaining pricing quotes requires manual phone calls or emails, causing delays in event planning.
4. **Availability Uncertainty:** Customers often inquire about venues only to discover their required event dates are already booked.
5. **Lack of Side-by-Side Comparison:** Comparing amenities, capacities, and base rates across multiple venues is cumbersome without a centralized comparison interface.
6. **Risk of Double Bookings:** Manual reservation systems carry a high risk of schedule conflicts and double bookings.

VenueHub resolves these issues by centralizing venue listings, providing real-time availability tracking, standardizing itemized quotation exchanges, and enforcing automated booking date protections.

---

### 5. Existing System
Existing venue discovery methods typically fall into two categories:
* **Traditional Offline Booking:** Direct physical visits or phone calls to local banquet halls, hotels, and lawns.
* **Generic Directory Portals:** Online business directories (e.g., Yellow Pages, general classifieds) that list venue names and phone numbers without interactive availability, comparison tools, or itemized quotation capabilities.

---

### 6. Limitations of Existing System
* **No Real-Time Availability:** Users cannot check if a venue is free on a specific date before calling.
* **Lack of Standardized Quotations:** No mechanism exists for venue owners to issue itemized digital price estimates detailing hall rental, food packages, and decor.
* **No Direct Booking Workflow:** Users cannot accept quotes and confirm bookings directly within a single software portal.
* **Unverified Customer Feedback:** Reviews on generic portals are often unverified and not tied to actual completed bookings.
* **Manual Administrative Overhead:** Venue owners rely on physical registers or separate spreadsheets to track inquiries and bookings.

---

### 7. Proposed System
VenueHub introduces an end-to-end multi-role web platform that digitizes and automates the entire venue discovery and booking lifecycle:
* **Centralized Discovery Engine:** Multi-criteria filtering by city, event type, guest capacity, and base price.
* **Side-by-Side Comparison & Wishlist:** Tools allowing customers to evaluate up to 3 venues side-by-side or save favorites to a personal wishlist.
* **Digital Quotation Exchange:** Customers submit custom event requirements (date, guest count, event type, notes), and venue owners respond with itemized cost breakdowns (rental, catering, decoration, audio/visual).
* **Automated Booking & Date Protection:** Accepting a quotation allows instant booking confirmation, which automatically updates the venue's availability calendar to `booked`, blocking duplicate reservations.
* **Verified Review System:** Customers can leave ratings (1–5 stars) and reviews strictly after completing a verified booking.
* **Role-Based Governance:** Separate dedicated portals for Customers, Venue Owners, and System Administrators.

---

### 8. Objectives
1. Centralize venue discovery across multiple cities and event categories.
2. Provide multi-criteria search and filter tools based on capacity, pricing, and location.
3. Enable side-by-side comparison of venue specifications and amenities.
4. Facilitate digital quotation requests and itemized pricing responses between customers and venue owners.
5. Automate date availability updates and prevent double bookings upon booking confirmation.
6. Restrict review submissions to customers with completed bookings to ensure feedback authenticity.
7. Implement real-time notifications for quotation updates, booking confirmations, and admin actions.
8. Enforce security through JWT authentication, bcrypt password hashing, and role-based authorization.

---

### 9. Scope
The scope of VenueHub encompasses:
* **User Accounts:** Registration, login, and profile management for Customers, Venue Owners, and Admins.
* **Listing Management:** Venue creation, image gallery, facility mapping, event type mapping, and pricing rules.
* **Discovery & Interaction:** Search filters, detailed venue pages, side-by-side comparison, wishlist, quotation requests, quote acceptance/rejection, booking creation, date locking, post-booking reviews, and notifications.
* **Platform Governance:** Administrative venue approval/rejection, user account status toggling, and system-wide monitoring.

*Out of Scope for Current Release:* Integrated third-party payment gateways, real-time live chat, native mobile app builds, and automated SMS gateways (handled as future enhancements).

---

### 10. Key Features
* **Multi-Criteria Search & Filtering:** Filter venues by city, minimum/maximum guest capacity, event type, and base price range.
* **Interactive Venue Detail Pages:** View full descriptions, address details, image galleries, assigned event types, and available amenities (AC, Parking, Power Backup, Catering, DJ).
* **Side-by-Side Compare Engine:** Compare up to 3 venues simultaneously across capacity, location, price, and facilities.
* **Customer Wishlist:** Save favorite venues to a personal wishlist linked to the user account.
* **Itemized Quotation Workflow:** Customers request quotes; owners provide itemized cost breakdowns; customers accept or reject offers.
* **Booking & Automatic Date Locking:** Booking an accepted quotation automatically locks the venue's availability calendar date as `booked`.
* **Verified Reviews & Ratings:** Only customers with completed bookings can submit 1–5 star reviews and feedback.
* **Notifications System:** Automated alerts for quotation updates, booking status changes, and administrative actions.
* **Comprehensive Admin Control:** Approve new venue applications, activate/deactivate venues, toggle user account statuses, and monitor system metrics.

---

### 11. User Roles
VenueHub defines three distinct user roles with specific system permissions:
1. **Customer:**
   * Search and filter public venues.
   * View detailed venue profiles and customer reviews.
   * Add/remove venues from personal wishlist and comparison list.
   * Submit quotation requests and accept/reject owner quotes.
   * Confirm bookings for accepted quotations.
   * Submit ratings and reviews for completed bookings.
   * View notifications and account dashboard.
2. **Venue Owner:**
   * Create, update, and manage venue listings.
   * Configure assigned event types, facilities, and pricing structures.
   * Manage date availability calendars (mark dates as available, booked, or blocked).
   * View incoming customer quotation requests.
   * Build and submit itemized pricing proposals to customers.
   * Monitor venue bookings and customer reviews.
3. **Administrator:**
   * Monitor platform-wide statistics (total users, venues, quotations, bookings, reviews).
   * Approve or reject pending venue listings submitted by owners.
   * Activate or deactivate registered user accounts and venues.
   * Oversee overall system health and data integrity.

---

### 12. Functional Requirements
* **FR-1 Authentication:** The system shall allow users to register and log in securely, issuing JWT tokens with role assignments (`customer`, `venue_owner`, `admin`).
* **FR-2 Venue Management:** Venue owners shall be able to add, edit, and update venue details, guest capacities, locations, and amenities.
* **FR-3 Venue Search:** The system shall allow unauthenticated and authenticated users to search venues by city, capacity, price, and event type.
* **FR-4 Quotation Processing:** Customers shall submit quotation requests with event date, guest count, and notes. Owners shall respond with itemized price line items.
* **FR-5 Booking Creation:** Upon customer acceptance of a quotation, the system shall allow booking creation and automatically update the corresponding venue availability date to `booked`.
* **FR-6 Double Booking Prevention:** The system shall reject booking attempts on dates marked as `booked` or `blocked`.
* **FR-7 Review Enforcement:** The system shall restrict review creation to customers possessing a `completed` booking for that specific venue.
* **FR-8 Administrative Control:** Administrators shall be able to update venue approval status (`pending`, `approved`, `rejected`) and user status (`active`, `inactive`).

---

### 13. Non-Functional Requirements
* **NFR-1 Security:** Passwords must be hashed using `bcrypt`. API routes must authenticate via JWT tokens and enforce Role-Based Access Control (RBAC).
* **NFR-2 Performance:** API response times for venue search and listing endpoints should be under 200ms under standard loads.
* **NFR-3 Reliability & Data Integrity:** Database operations must use MySQL InnoDB engine with foreign key constraints and transaction rollback mechanisms.
* **NFR-4 Usability:** The interface must be responsive across Desktop (1440px, 1280px), Tablet (768px), and Mobile (390px, 375px) screen resolutions.
* **NFR-5 Maintainability:** Decoupled architecture with clear separation between React UI components, Flask REST controllers, and MySQL data models.

---

### 14. Technology Stack
* **Frontend Framework:** React (v19.2.8) built with Vite (v8.2.2)
* **Frontend Routing:** React Router DOM (v7.18.3)
* **HTTP Client:** Axios (v1.20.0)
* **Styling:** Vanilla CSS3 (CSS Variables, Flexbox, Grid Layouts, Animations)
* **Backend Framework:** Python (v3.12.0) with Flask (v3.1.3)
* **CORS Middleware:** Flask-CORS (v6.0.5)
* **Authentication & Hashing:** PyJWT (v2.13.0) and bcrypt (v5.0.0)
* **Database Management System:** MySQL (v8.0+) with PyMySQL (v1.2.0) driver
* **Configuration Management:** python-dotenv (v1.2.3)

---

### 15. System Architecture
VenueHub follows a modern 3-tier decoupled client-server architecture:
1. **Presentation Layer (Frontend):** A Single Page Application (SPA) built with React and Vite. Handles user interface rendering, client-side routing, state management, form validation, and local storage (for venue comparison).
2. **Application Layer (Backend):** A Flask RESTful Web Service. Implements API endpoints, JWT token verification, role-based authorization guards, business logic, payload validation, and CORS handling.
3. **Data Layer (Database):** A relational MySQL database operating with InnoDB engine. Manages 15 tables with foreign key constraints, indexes, and primary keys.

```
+-------------------------------------------------------+
|                 CLIENT BROWSER (REACT SPA)            |
|  - Pages (Home, Venues, Detail, Compare, Dashboard)   |
|  - Components (Navbar, Cards, Modals, Forms)          |
+---------------------------+---------------------------+
                            |
                     HTTP / REST API (JSON)
                            |
+---------------------------v---------------------------+
|                 FLASK BACKEND SERVER                  |
|  - Blueprint Routes (/api/auth, /api/venues, etc.)    |
|  - JWT Authentication & RBAC Middleware               |
|  - Business Logic & Payload Validation                |
+---------------------------+---------------------------+
                            |
                    PyMySQL Database Connection
                            |
+---------------------------v---------------------------+
|                   MYSQL DATABASE                      |
|  - 15 Relational Tables (InnoDB Engine)              |
|  - Foreign Key Constraints & Index Optimizations     |
+-------------------------------------------------------+
```

---

### 16. Module Description

#### Module 1: Authentication Module
* **Purpose:** Manages user registration, login, JWT token issuance, and credential security.
* **Main Functionality:** Validates email uniqueness, hashes passwords via `bcrypt`, generates JWT tokens with embedded `user_id` and `role`, and verifies incoming Bearer tokens.
* **Key APIs:** `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
* **Database Tables:** `users`

#### Module 2: Customer Module
* **Purpose:** Handles customer-specific dashboard view, profile metadata, and activity tracking.
* **Main Functionality:** Displays active quotation requests, confirmed/completed bookings, saved wishlist items, and personal notification logs.
* **Key APIs:** `GET /api/quotations/my`, `GET /api/bookings/my`, `GET /api/wishlist/my`
* **Database Tables:** `users`, `quotations`, `bookings`, `wishlist`

#### Module 3: Venue Discovery Module
* **Purpose:** Provides public venue listing and multi-criteria search capabilities.
* **Main Functionality:** Filters active and approved venues by city, minimum/maximum capacity, event type, and price range.
* **Key APIs:** `GET /api/venues`, `GET /api/venues/search`
* **Database Tables:** `venues`, `venue_images`, `event_types`, `venue_event_types`

#### Module 4: Venue Details Module
* **Purpose:** Displays complete information for a specific venue listing.
* **Main Functionality:** Fetches venue metadata, owner details, image gallery, assigned amenities, supported event types, pricing breakdown, and approved customer reviews.
* **Key APIs:** `GET /api/venues/<id>`, `GET /api/venues/<id>/reviews`
* **Database Tables:** `venues`, `venue_images`, `facilities`, `venue_facilities`, `event_types`, `venue_event_types`, `venue_pricing`, `reviews`

#### Module 5: Compare Module
* **Purpose:** Enables side-by-side comparison of selected venues.
* **Main Functionality:** Maintains selected venue IDs in browser local storage (`venuehub_compare`) and renders a comparative matrix covering pricing, capacities, location, and amenities.
* **Key APIs:** `GET /api/venues/<id>`
* **Database Tables:** `venues`, `facilities`

#### Module 6: Wishlist Module
* **Purpose:** Allows customers to save favorite venues to their account.
* **Main Functionality:** Adds venue to wishlist, prevents duplicate entries (`409 Conflict`), retrieves saved wishlist items, and deletes items.
* **Key APIs:** `POST /api/wishlist`, `GET /api/wishlist/my`, `DELETE /api/wishlist/<venue_id>`
* **Database Tables:** `wishlist`, `venues`

#### Module 7: Quotation Module
* **Purpose:** Facilitates custom pricing requests and responses between customers and venue owners.
* **Main Functionality:** Customers create quotation requests for specific dates and guest counts (`pending`). Owners respond with itemized cost line items (`quoted`). Customers accept (`accepted`) or reject (`rejected`).
* **Key APIs:** `POST /api/quotations`, `GET /api/quotations/my`, `GET /api/venues/<id>/quotations`, `POST /api/quotations/<id>/quote`, `POST /api/quotations/<id>/accept`, `POST /api/quotations/<id>/reject`
* **Database Tables:** `quotations`, `quotation_items`, `venues`

#### Module 8: Booking Module
* **Purpose:** Manages finalized venue reservations.
* **Main Functionality:** Creates a booking from an accepted quotation (`confirmed`), updates venue date availability to `booked`, and allows status transitions (`completed`, `cancelled`).
* **Key APIs:** `POST /api/bookings`, `GET /api/bookings/my`, `GET /api/venues/<id>/bookings`, `PUT /api/bookings/<id>/status`
* **Database Tables:** `bookings`, `quotations`, `availability`, `venues`

#### Module 9: Availability Module
* **Purpose:** Tracks and protects venue calendar dates.
* **Main Functionality:** Venue owners view and set date statuses (`available`, `blocked`). Booking creation automatically sets date status to `booked`.
* **Key APIs:** `GET /api/venues/<id>/availability`, `POST /api/venues/<id>/availability`, `PUT /api/availability/<id>`
* **Database Tables:** `availability`, `venues`

#### Module 10: Review & Rating Module
* **Purpose:** Manages customer feedback and venue rating scores.
* **Main Functionality:** Allows customers with `completed` bookings to post a 1–5 star rating and comment. Calculates venue average rating score.
* **Key APIs:** `POST /api/reviews`, `GET /api/venues/<id>/reviews`
* **Database Tables:** `reviews`, `bookings`, `venues`

#### Module 11: Notification Module
* **Purpose:** Delivers platform alerts and activity notifications to users.
* **Main Functionality:** Generates notifications on quotation responses, acceptances, booking confirmations, and admin approvals. Allows users to view notifications, fetch unread count, and mark notifications as read.
* **Key APIs:** `GET /api/notifications`, `GET /api/notifications/unread-count`, `PUT /api/notifications/<id>/read`, `PUT /api/notifications/read-all`
* **Database Tables:** `notifications`

#### Module 12: Venue Owner Module
* **Purpose:** Owner management portal for property listings, pricing, and availability.
* **Main Functionality:** Listing creation, editing, mapping facilities and event types, defining pricing components, viewing incoming quotation inquiries, and tracking bookings.
* **Key APIs:** `GET /api/venues/my`, `POST /api/venues`, `PUT /api/venues/<id>`, `POST /api/venues/<id>/facilities`, `POST /api/venues/<id>/event-types`, `POST /api/venues/<id>/pricing`
* **Database Tables:** `venues`, `venue_facilities`, `venue_event_types`, `venue_pricing`, `availability`

#### Module 13: Admin Module
* **Purpose:** Centralized administrative platform governance.
* **Main Functionality:** Displays platform statistics, manages venue approval statuses (`pending`, `approved`, `rejected`), toggles venue active states, manages user account statuses (`active`, `inactive`), and monitors overall bookings and quotations.
* **Key APIs:** `GET /api/admin/stats`, `GET /api/admin/venues`, `PUT /api/admin/venues/<id>/status`, `PUT /api/admin/venues/<id>/active`, `GET /api/admin/users`, `PUT /api/admin/users/<id>/status`
* **Database Tables:** `users`, `venues`, `bookings`, `quotations`, `reviews`

---

### 17. Database Design
VenueHub uses a MySQL relational database consisting of 15 tables with explicit foreign key relationships and indexes:

```sql
users (id, role, full_name, email, phone, password_hash, status, created_at, updated_at)
venues (id, owner_id, name, description, address, city, state, pincode, capacity_min, capacity_max, base_price, status, is_active, created_at, updated_at)
venue_images (id, venue_id, image_url, is_primary, caption, created_at)
event_types (id, name, description, created_at)
venue_event_types (venue_id, event_type_id) -- Junction Table
facilities (id, name, icon, created_at)
venue_facilities (venue_id, facility_id) -- Junction Table
venue_pricing (id, venue_id, pricing_type, item_name, price, is_optional, created_at, updated_at)
availability (id, venue_id, date, status, notes, created_at, updated_at)
quotations (id, customer_id, venue_id, event_type_id, event_date, guest_count, message, total_amount, status, created_at, updated_at)
quotation_items (id, quotation_id, item_name, unit_price, quantity, total_price, created_at)
bookings (id, customer_id, venue_id, quotation_id, event_date, guest_count, total_amount, advance_paid, status, created_at, updated_at)
reviews (id, venue_id, customer_id, booking_id, rating, comment, created_at)
wishlist (id, customer_id, venue_id, created_at)
notifications (id, user_id, title, message, is_read, created_at)
```

---

### 18. ER Diagram Description
* `users` has a 1-to-Many relationship with `venues` (One Venue Owner can list multiple venues).
* `venues` has a 1-to-Many relationship with `venue_images` (One venue has multiple gallery images).
* `venues` and `event_types` have a Many-to-Many relationship via `venue_event_types`.
* `venues` and `facilities` have a Many-to-Many relationship via `venue_facilities`.
* `venues` has a 1-to-Many relationship with `venue_pricing` (One venue has multiple price rules).
* `venues` has a 1-to-Many relationship with `availability` (One venue has multiple calendar date records).
* `users` (Customer) and `venues` have a 1-to-Many relationship with `quotations`.
* `quotations` has a 1-to-Many relationship with `quotation_items` (One quotation has multiple item lines).
* `quotations` has a 1-to-1 optional relationship with `bookings` (An accepted quotation becomes a booking).
* `users` (Customer) and `venues` have a 1-to-Many relationship with `bookings`.
* `bookings` has a 1-to-1 optional relationship with `reviews` (One completed booking yields one review).
* `users` (Customer) and `venues` have a Many-to-Many relationship via `wishlist`.
* `users` has a 1-to-Many relationship with `notifications` (One user receives multiple notification alerts).

---

### 19. API Architecture
The Flask backend exposes a structured RESTful API that communicates strictly using JSON data payloads:
* **Base URL:** `http://127.0.0.1:5000/api`
* **Content Type:** `application/json`
* **Response Structure:**
  ```json
  {
    "status": "success | error",
    "message": "Human readable description",
    "data": {}
  }
  ```
* **Authentication Header:** `Authorization: Bearer <JWT_TOKEN>`

---

### 20. Authentication & Authorization
* **Authentication:** Users authenticate via `/api/auth/login`. Upon verifying credentials against `bcrypt.checkpw()`, the backend issues a signed JWT token containing `user_id`, `role`, and expiration timestamp (`exp`).
* **Authorization Middleware:** Protected routes pass incoming requests through `verify_request_token(request)`. The backend extracts the token, verifies its signature using `JWT_SECRET_KEY`, checks token expiration, and evaluates the `role` against required permissions (e.g. `admin`, `venue_owner`, `customer`).

---

### 21. Main User Workflows
1. **Customer Discovery & Booking Workflow:** Search venues $\rightarrow$ Compare specifications $\rightarrow$ Save to Wishlist $\rightarrow$ Request Quotation $\rightarrow$ Review Itemized Quote $\rightarrow$ Accept Quotation $\rightarrow$ Confirm Booking $\rightarrow$ Receive Notifications $\rightarrow$ Post Review after Event.
2. **Venue Owner Management Workflow:** Create Listing $\rightarrow$ Map Facilities & Event Types $\rightarrow$ Define Pricing $\rightarrow$ View Quotation Requests $\rightarrow$ Issue Itemized Quotations $\rightarrow$ Monitor Bookings & Availability.
3. **Admin Governance Workflow:** Review Pending Venues $\rightarrow$ Approve/Reject Listings $\rightarrow$ Toggle Venue Active Status $\rightarrow$ Manage User Accounts $\rightarrow$ Audit Platform Metrics.

---

### 22. Customer Workflow
Customers discover venues using multi-criteria search filters, evaluate properties side-by-side or save them to their account wishlist, submit quotation requests specifying event date and guest count, review itemized price estimates issued by owners, accept favorable quotes, convert accepted quotes into bookings, and submit verified reviews upon event completion.

---

### 23. Venue Owner Workflow
Venue owners create detailed listings, upload property descriptions and images, select supported amenities and event types, define pricing rules, maintain availability calendars, receive real-time notifications for incoming inquiries, construct custom itemized quotes, and track confirmed venue reservations.

---

### 24. Admin Workflow
Administrators log into a dedicated admin portal to monitor platform statistics, approve or reject new venue submissions, toggle user account active/inactive statuses, toggle venue visibility, and maintain platform quality standards.

---

### 25. Search & Availability Logic
* **Search Logic:** Executes dynamic SQL queries with `WHERE` conditions filtering active (`is_active = TRUE`) and approved (`status = 'approved'`) venues based on city, minimum/maximum guest capacity, event types, and base price limits.
* **Availability Logic:** Checks the `availability` table for date entries matching the requested venue and event date. If no entry exists or `status = 'available'`, the date is open. If `status = 'booked'` or `status = 'blocked'`, quotation requests or bookings are rejected.

---

### 26. Quotation Workflow
1. Customer submits quotation request (`status = 'pending'`).
2. Owner receives notification and views request details.
3. Owner submits itemized breakdown (`quotation_items` table: item name, unit price, quantity, total price) and total cost (`status = 'quoted'`).
4. Customer receives notification and views itemized estimate.
5. Customer accepts (`status = 'accepted'`) or rejects (`status = 'rejected'`).

---

### 27. Booking Workflow
1. Customer initiates booking creation for an `accepted` quotation.
2. System checks date availability for schedule conflicts.
3. System inserts record into `bookings` (`status = 'confirmed'`).
4. System automatically inserts or updates `availability` table for that venue and date to `status = 'booked'`.
5. System generates confirmation notifications for both Customer and Owner.

---

### 28. Review & Rating Workflow
1. Customer attempts to post a review (rating 1–5 stars and comment).
2. Backend checks if customer has a valid booking with `status = 'completed'` for that venue.
3. Backend validates that no previous review exists for that specific `booking_id`.
4. System saves review and updates venue's aggregate rating score.

---

### 29. Wishlist & Compare Workflow
* **Wishlist:** Saved server-side in the `wishlist` table (unique key `uk_customer_venue` prevents duplicate entries).
* **Compare:** Managed client-side in `localStorage` under key `venuehub_compare`. Up to 3 venues can be compared side-by-side across pricing, capacity, location, and facilities.

---

### 30. Notification Workflow
When key events occur (Quotation Created, Quote Responded, Quote Accepted, Booking Confirmed, Venue Approved), the backend inserts alert records into the `notifications` table for target users. Users view alerts via a navbar bell icon displaying an unread counter badge.

---

### 31. Security Measures
* **Password Security:** Passwords hashed with `bcrypt` before storage.
* **JWT Stateless Authentication:** Signed tokens with configurable secret keys and expiration.
* **Role-Based Access Control (RBAC):** Middleware checks `user_role` on all restricted API routes.
* **Resource Ownership Isolation:** Venue Owners can only edit their own venues/quotations; Customers can only view/manage their own bookings/quotations.
* **SQL Injection Prevention:** Parameterized SQL queries using PyMySQL cursor parameters (`%s`).
* **Cross-Origin Resource Sharing (CORS):** Managed via `flask_cors` to restrict unauthorized domain origins.

---

### 32. Testing Strategy
Testing was executed across multiple tiers:
1. **API Endpoint Testing:** Automated Python test scripts targeting REST endpoints.
2. **Role & RBAC Security Testing:** Verified 401 Unauthorized for missing tokens and 403 Forbidden for unauthorized role calls.
3. **Integration & E2E Workflow Testing:** Verified Quotation $\rightarrow$ Booking $\rightarrow$ Availability Date Protection sequence.
4. **Database Read-Only Verification:** Verified schema constraints, foreign key cascades, and record preservation.
5. **Frontend Build & Cross-Browser Verification:** Executed `npm run build` (0 errors) and verified responsive layouts across screen viewports.

---

### 33. Test Cases

| Test ID | Module | Scenario | Preconditions | Action | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-01** | Auth | Register new Customer account | Email not registered | Submit registration form | Account created (`201 Created`) | Account created | `PASS` |
| **TC-02** | Auth | Login with invalid password | User registered | Submit incorrect password | Error `401 Unauthorized` returned | `401 Unauthorized` | `PASS` |
| **TC-03** | Venues | Search venues by city | Venues exist | Search `city=Bhilwara` | Return matching active approved venues | Returned Venue #1 | `PASS` |
| **TC-04** | Compare | Compare 2 venues | Venues selected | Click Compare | Render comparative matrix | Rendered matrix | `PASS` |
| **TC-05** | Wishlist | Add venue to wishlist | Customer logged in | Click Wishlist icon | Venue saved to `wishlist` table | Saved (`201 Created`) | `PASS` |
| **TC-06** | Wishlist | Prevent duplicate wishlist item | Item in wishlist | Add same venue again | Return `409 Conflict` | Returned `409 Conflict` | `PASS` |
| **TC-07** | Quotation | Submit quotation request | Customer logged in | Submit quote form for date | Quotation created (`pending`) | Created Request #8 | `PASS` |
| **TC-08** | Quotation | Owner issue itemized quote | Pending quote exists | Submit itemized price items | Quote status updated to `quoted` | Updated to `quoted` | `PASS` |
| **TC-09** | Booking | Convert quote to booking | Quote `accepted` | Click Book Venue | Booking #3 created (`confirmed`) | Created Booking #3 | `PASS` |
| **TC-10** | Availability | Automatic date protection | Booking created | Inspect availability calendar | Date status updated to `booked` | Marked `booked` | `PASS` |
| **TC-11** | Reviews | Post review on completed booking | Booking `completed` | Submit 5★ review & comment | Review #1 saved successfully | Review #1 saved | `PASS` |
| **TC-12** | Reviews | Reject review on confirmed booking | Booking `confirmed` | Submit review attempt | Rejected (`400/403 Error`) | Rejected | `PASS` |
| **TC-13** | Admin | Customer access admin stats | Logged in as Customer | Call `GET /api/admin/stats` | Access denied (`403 Forbidden`) | Returned `403 Forbidden` | `PASS` |
| **TC-14** | Admin | Approve pending venue | Pending venue exists | Admin submits status update | Venue status set to `approved` | Status set `approved` | `PASS` |

---

### 34. Results
* **Automated Master Test Suite:** 100% assertions passed (`scratch/test_stage10_master.py`).
* **Frontend Build Status:** `npm run build` executed successfully in 151ms with **0 Errors**.
* **Preserved Database Records Verified:**
  * **Venue #1:** Royal Palace Banquet (`status='approved'`, `is_active=1`)
  * **Quotation #8:** Total ₹205,000.00 (`status='accepted'`)
  * **Booking #3:** Confirmed for 2026-11-15 (60 guests, ₹205,000.00)
  * **Reviews:** Review #1 (5★) and Review #2 (5★) verified intact.

---

### 35. Advantages
* **Transparent Pricing:** Itemized quotation breakdown eliminates hidden costs.
* **Double Booking Protection:** Automatic calendar availability locking.
* **Efficient Discovery:** Multi-criteria search and side-by-side comparison.
* **Verified Reviews:** Only customers with completed bookings can post feedback.
* **Multi-Role Governance:** Tailored portals for Customers, Owners, and Admins.
* **Decoupled Architecture:** Easily scalable React SPA and Flask REST API.

---

### 36. Limitations
* **No Integrated Online Payment Gateway:** Payments are managed offline or recorded manually as advance payments.
* **No Real-Time Chat System:** Customer-owner communication relies on structured quotation messaging.
* **No External SMS/Email Gateway:** Notifications are displayed within the web portal interface.
* **Demonstration Inventory:** Current demonstration database features selected representative venues.

---

### 37. Future Scope
* **Online Payment Gateway Integration:** Incorporate Razorpay or Stripe for digital advance booking deposits.
* **Real-Time Instant Messaging:** Socket.io integration for direct chat between customers and venue owners.
* **Automated Email & SMS Alerts:** Twilio and SendGrid integrations for booking reminders.
* **Interactive Map Integration:** Map-based venue location discovery using OpenStreetMap or Google Maps.
* **AI-Powered Recommendation Engine:** Personalized venue suggestions based on user search history and budget.

---

### 38. Conclusion
VenueHub successfully addresses the fragmentation, lack of transparency, and operational inefficiencies of traditional event venue booking. By providing an integrated multi-vendor web marketplace built with React, Flask, and MySQL, VenueHub streamlines venue discovery, enables side-by-side venue comparison, automates itemized quotation exchanges, enforces booking date protections, and maintains role-based platform security. Automated testing and empirical database verification confirm that the system is robust, secure, and ready for deployment.

---

### 39. References
1. Elmasri, R., & Navathe, S. B. (2015). *Fundamentals of Database Systems* (7th ed.). Pearson.
2. Grinberg, M. (2018). *Flask Web Development: Developing Web Applications with Python* (2nd ed.). O'Reilly Media.
3. Banks, A., & Porcello, E. (2020). *Learning React: Modern Patterns for Developing React Applications* (2nd ed.). O'Reilly Media.
4. Fielding, R. T. (2000). *Architectural Styles and the Design of Network-based Software Architectures* (Doctoral dissertation, University of California, Irvine).
5. MySQL 8.0 Reference Manual. Oracle Corporation. Retrieved from https://dev.mysql.com/doc/refman/8.0/en/
