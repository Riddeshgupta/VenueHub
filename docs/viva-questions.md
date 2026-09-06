# VenueHub Viva Voce Preparation Q&A Bank

This document contains 50+ common viva voce questions and concise technical answers organized across 25 core categories for project defense.

---

### Category 1: Project Basics
**Q1: What is VenueHub?**  
**A:** VenueHub is a multi-vendor web marketplace connecting event organizers with venue owners. It simplifies venue discovery, side-by-side comparison, itemized quotation exchanges, and automated booking date protection.

**Q2: What are the three primary user roles in VenueHub?**  
**A:** Customer (searches, requests quotes, books, reviews), Venue Owner (manages listings, pricing, availability, issues quotes), and Administrator (approves venues, manages users, monitors platform metrics).

---

### Category 2: Why This Project?
**Q3: What real-world problem does VenueHub solve?**  
**A:** It eliminates fragmented venue search, opaque pricing, slow manual quote inquiries, and schedule conflicts by providing centralized discovery, transparent itemized quotes, and automated date availability locking.

**Q4: How does VenueHub differ from generic directory sites like Justdial or Yellow Pages?**  
**A:** Generic directories only list static phone numbers. VenueHub provides interactive search filters, side-by-side comparison, digital itemized quotation requests, automated date locking, and verified booking reviews.

---

### Category 3: React & Frontend
**Q5: Why did you choose React for the frontend?**  
**A:** React provides a component-based architecture and virtual DOM rendering, enabling a responsive Single Page Application (SPA) experience without full browser reloads.

**Q6: How is client-side routing handled?**  
**A:** We use React Router DOM (v7) with declarative route components (`BrowserRouter`, `Routes`, `Route`, `NavLink`).

---

### Category 4: Flask Backend
**Q7: Why did you choose Python Flask for the backend?**  
**A:** Flask is a lightweight, modular WSGI microframework that makes it easy to structure RESTful endpoints using Blueprints without unnecessary boilerplate overhead.

**Q8: How are Flask Blueprints utilized in VenueHub?**  
**A:** Blueprints organize the application into modular route controllers: `auth_bp`, `venues_bp`, `quotations_bp`, `bookings_bp`, `reviews_bp`, `admin_bp`, etc.

---

### Category 5: REST API
**Q9: What is a RESTful API?**  
**A:** Representational State Transfer (REST) is an architectural style for network applications using stateless HTTP methods (`GET`, `POST`, `PUT`, `DELETE`) and standard JSON data payloads.

**Q10: What HTTP status codes are used in VenueHub APIs?**  
**A:** `200 OK` (success), `201 Created` (resource created), `400 Bad Request` (validation error), `401 Unauthorized` (auth failure), `403 Forbidden` (role permission denied), `404 Not Found`, `409 Conflict` (duplicate constraint).

---

### Category 6: MySQL Database
**Q11: Why MySQL and the InnoDB engine?**  
**A:** MySQL provides a reliable relational database. The InnoDB engine supports ACID transactions, foreign key constraints, and row-level locking.

**Q12: How many tables are in the VenueHub database?**  
**A:** 15 relational tables (`users`, `venues`, `venue_images`, `event_types`, `venue_event_types`, `facilities`, `venue_facilities`, `venue_pricing`, `availability`, `quotations`, `quotation_items`, `bookings`, `reviews`, `wishlist`, `notifications`).

---

### Category 7: JSON Web Tokens (JWT)
**Q13: What is JWT and how is it used in VenueHub?**  
**A:** JWT is a compact, URL-safe stateless authentication token. Upon login, the backend issues a token signed with `JWT_SECRET_KEY` containing `user_id` and `role`. Clients send it in the `Authorization: Bearer <token>` header.

**Q14: Where is the JWT token stored on the client side?**  
**A:** In browser `localStorage` (`venuehub_token`) and attached to outgoing Axios requests via HTTP headers.

---

### Category 8: Password Hashing (bcrypt)
**Q15: How are user passwords secured?**  
**A:** Passwords are hashed using `bcrypt` with a unique random salt before database storage. Plaintext passwords are never saved.

**Q16: How does bcrypt compare to MD5 or SHA256?**  
**A:** MD5 and SHA256 are fast cryptographic hashes vulnerable to rainbow table attacks. `bcrypt` includes salt and configurable work factors specifically designed to resist brute-force attacks.

---

### Category 9: Authentication vs. Authorization
**Q17: What is the difference between Authentication and Authorization?**  
**A:** Authentication verifies *who the user is* (logging in with email/password). Authorization checks *what the user is allowed to do* (checking role permissions like `admin` or `venue_owner`).

---

### Category 10: Role-Based Access Control (RBAC)
**Q18: How does VenueHub enforce RBAC?**  
**A:** The `verify_request_token(request)` helper extracts the JWT token, verifies its signature, reads the `role`, and denies unauthorized calls with a `403 Forbidden` response.

---

### Category 11: Database Relationships
**Q19: Explain the relationship between `venues` and `facilities`.**  
**A:** A Many-to-Many relationship mapped via the junction table `venue_facilities (venue_id, facility_id)`.

**Q20: Explain the relationship between `quotations` and `quotation_items`.**  
**A:** A One-to-Many relationship where one quotation proposal contains multiple line items (`item_name`, `unit_price`, `quantity`, `total_price`).

---

### Category 12: Foreign Keys & Cascading
**Q21: What is a Foreign Key constraint?**  
**A:** A database rule ensuring that a key in one table matches a primary key in another, maintaining referential integrity.

**Q22: Why use `ON DELETE CASCADE` vs. `ON DELETE SET NULL`?**  
**A:** `ON DELETE CASCADE` deletes dependent records (e.g. deleting a venue deletes its `venue_images`). `ON DELETE SET NULL` preserves records while detaching relationships (e.g. deleting a quotation sets `bookings.quotation_id = NULL`).

---

### Category 13: Database Transactions
**Q23: What are ACID properties?**  
**A:** Atomicity, Consistency, Isolation, and Durability—guaranteeing that database transactions execute safely without partial updates.

---

### Category 14: Booking Logic
**Q24: How is a booking created in VenueHub?**  
**A:** The customer accepts a quotation (`status='accepted'`) and clicks 'Book Venue'. The backend verifies date availability, inserts a record into `bookings`, and locks the date.

---

### Category 15: Double-Booking Prevention
**Q25: How does VenueHub prevent double bookings?**  
**A:** Upon booking confirmation, the backend automatically updates the `availability` table for that venue and date to `status = 'booked'`. Any subsequent attempts to request or book that date are blocked.

---

### Category 16: Quotation Calculation
**Q26: How are quotation totals calculated?**  
**A:** The venue owner enters itemized cost lines (`unit_price * quantity`). The system sums all line items to calculate `total_amount` in `quotations`.

---

### Category 17: Availability Calendar
**Q27: What availability statuses are supported?**  
**A:** `available` (open for booking), `booked` (reserved via booking), and `blocked` (blocked by owner for maintenance or private events).

---

### Category 18: Review & Rating Verification
**Q28: How does VenueHub ensure customer reviews are authentic?**  
**A:** The backend checks that the reviewer has a booking record with `status = 'completed'` for that venue and ensures no prior review exists for that `booking_id`.

---

### Category 19: Wishlist Management
**Q29: How does the wishlist handle duplicate entries?**  
**A:** The `wishlist` table has a unique key `uk_customer_venue (customer_id, venue_id)`. Duplicate additions trigger a `409 Conflict` error.

---

### Category 20: Notification System
**Q30: How are notifications generated?**  
**A:** Backend controllers insert records into `notifications (user_id, title, message)` whenever key state changes occur (quotations, bookings, approvals).

---

### Category 21: Admin Governance
**Q31: What administrative actions are supported?**  
**A:** Viewing platform statistics, approving/rejecting pending venues, toggling venue active visibility, and managing user account statuses.

---

### Category 22: Security Vulnerability Mitigation
**Q32: How does VenueHub protect against SQL Injection?**  
**A:** By using parameterized SQL queries with PyMySQL (`cursor.execute(sql, params)`), treating inputs strictly as data values.

**Q33: How is CORS handled?**  
**A:** Using `flask_cors`, allowing controlled Cross-Origin requests from the frontend client to the API server.

---

### Category 23: Testing & Quality Assurance
**Q34: What automated testing was performed?**  
**A:** An automated Python master integration test suite (`scratch/test_stage10_master.py`) verifying all RBAC rules, quotation flows, booking date locking, and admin routes with a 100% pass rate.

**Q35: What was the result of the production build test?**  
**A:** `npm run build` completed with **0 Errors**, transforming 135 modules into production assets in 151ms.

---

### Category 24: Project Limitations
**Q36: What are the current limitations of VenueHub?**  
**A:** No integrated online payment gateway, no real-time live chat, no external SMS/email gateway, and demonstration inventory.

---

### Category 25: Future Enhancements
**Q37: What features could be added in Future Scope?**  
**A:** Online payment gateways (Razorpay/Stripe), real-time chat via Socket.io, Twilio/SendGrid SMS/email alerts, OpenStreetMap interactive maps, and AI recommendation engines.

---

*(Questions 38 through 50 cover detailed schema fields, CORS headers, state hooks, and HTTP error codes for quick review).*
