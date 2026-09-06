# VenueHub Live Demonstration Script

This document provides a step-by-step 10–15 minute live presentation demonstration walkthrough for evaluators and panel members.

---

## Demonstration Sequence

### Step 1: Open Homepage & Public Discovery
* **What to Click:** Navigate to `http://localhost:5173/` in the browser.
* **What to Show:** Homepage hero section, search bar filters (City, Guest Count, Event Type), and featured venue cards.
* **What to Explain Verbally:** "Notice the clean, modern interface. Unauthenticated visitors can browse active venues immediately without registering."

### Step 2: Perform Venue Search & Filtering
* **What to Click:** Select City `Bhilwara` and click **Search Venues**.
* **What to Show:** The venue search results page displaying **Royal Palace Banquet** with capacity and base price details.
* **What to Explain Verbally:** "The discovery engine dynamically queries the database for approved, active venues matching the filter criteria."

### Step 3: Open Venue Detail Page
* **What to Click:** Click on **Royal Palace Banquet** card.
* **What to Show:** Full venue details page: property overview, capacity range (50–500), base price (₹100,000), photo gallery, mapped facilities (AC, Parking, Catering, DJ), pricing rules, and existing 5-star customer reviews.
* **What to Explain Verbally:** "Here, customers can review complete property specifications, available amenities, pricing components, and verified feedback."

### Step 4: Compare & Wishlist Operations
* **What to Click:** Click **Add to Compare** and **Add to Wishlist**. Navigate to `/compare`.
* **What to Show:** Side-by-side comparison table showing specs of selected venues.
* **What to Explain Verbally:** "The compare tool stores selected items in browser local storage for instant side-by-side evaluation, while the wishlist saves favorites directly to the user's account."

### Step 5: Customer Sign-In & Quotation Request
* **What to Click:** Click **Login**, sign in as Customer (`testuser@venuehub.com` / `password123`). Navigate back to Venue Detail and click **Request Quotation**.
* **What to Show:** Quotation modal form. Fill Event Date (`2026-11-15`), Guests (`60`), and Notes ("Wedding Reception inquiry"). Click **Submit Request**.
* **What to Explain Verbally:** "Instead of opaque phone estimates, the customer submits a structured quotation request containing their exact event parameters."

### Step 6: Owner Sign-In & Itemized Quotation Creation
* **What to Click:** Logout customer, sign in as Venue Owner (`owner@venuehub.com` / `password123`). Open **Owner Dashboard** $\rightarrow$ **Quotations**.
* **What to Show:** Incoming customer quotation request. Click **Create Quotation**.
* **What to Show:** Itemized cost form. Enter line items:
  1. Hall Rental: ₹100,000
  2. Food Package: ₹800 $\times$ 100 = ₹80,000
  3. Decoration: ₹25,000
  * **Total:** ₹205,000. Click **Submit Quotation**.
* **What to Explain Verbally:** "The venue owner builds an itemized cost estimate. The system calculates line items automatically, providing total price transparency."

### Step 7: Customer Accepts Quote & Confirms Booking
* **What to Click:** Sign back in as Customer (`testuser@venuehub.com`). Open **My Quotations**.
* **What to Show:** Quotation #8 displaying status `quoted` with full itemized breakdown (₹205,000 total). Click **Accept Quotation**, then click **Book Venue**.
* **What to Show:** Booking confirmation screen displaying **Booking #3** (`confirmed`, ₹205,000, Date: 2026-11-15, 60 guests).
* **What to Explain Verbally:** "Once accepted, the customer confirms the reservation directly in the portal."

### Step 8: Automatic Availability Locking & Notification Audit
* **What to Click:** Sign back in as Owner, open **Availability Calendar**.
* **What to Show:** Date `2026-11-15` automatically marked with status `booked`. Click navbar bell icon to show unread notifications badge.
* **What to Explain Verbally:** "Notice that date 2026-11-15 is now locked as 'booked'. Any subsequent attempts to request or book this venue on this date will be automatically blocked, eliminating double bookings."

### Step 9: Post-Event Review Rules
* **What to Click:** Open Customer Dashboard $\rightarrow$ **My Bookings**.
* **What to Show:** Completed bookings allow review submission; non-completed bookings block review attempts.
* **What to Explain Verbally:** "To prevent fake feedback, the system restricts reviews strictly to customers with verified completed bookings."

### Step 10: Admin Governance & Monitoring
* **What to Click:** Logout, sign in as Admin (`riddesh.24it567@rtu.ac.in` / `password123`). Open **Admin Dashboard**.
* **What to Show:** System statistics overview (Total Users, Venues, Quotations, Bookings, Reviews). Open **Venue Management** and **User Management**.
* **What to Explain Verbally:** "The Admin portal provides top-level governance—evaluating new venue submissions, toggling listing visibility, and managing user accounts."
