# VenueHub Master Test Cases & Empirical Verification Document

This document provides the formal test case execution log for **VenueHub**, documenting test scenarios, inputs, expected results, actual observed results, and verification statuses across Stages 5 through 10.

---

## 1. Verified Record Baseline

The following baseline records were empirically verified in the live MySQL `venuehub` database:

* **Venue #1:** Royal Palace Banquet (`status = 'approved'`, `is_active = TRUE`, `owner_id = 2`).
* **Quotation #8:** Customer ID 1, Venue ID 1, Total Amount = **₹205,000.00** (`status = 'accepted'`).
* **Booking #3:** Customer ID 1, Venue ID 1, Quotation ID 8, Event Date = **2026-11-15**, Guest Count = **60**, Total Amount = **₹205,000.00** (`status = 'confirmed'`).
* **Reviews:** Review #1 (5 Stars, "Excellent venue and great service!") and Review #2 (5 Stars, "Excellent venue and great service for our event!").

---

## 2. Master Test Cases Log Table

| Test ID | Module | Test Scenario | Preconditions | Test Action | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-01** | Auth | Customer Registration | Email `newuser@example.com` not in DB | Submit `POST /api/auth/register` | User created (`201 Created`) | User record created in `users` | `PASS` |
| **TC-02** | Auth | Login with Incorrect Password | User registered | Submit invalid password to `POST /api/auth/login` | Return `401 Unauthorized` | Returned `401 Unauthorized` | `PASS` |
| **TC-03** | Auth | Login with Valid Credentials | User registered | Submit valid email & password | Return JWT token & user info | Token returned (`200 OK`) | `PASS` |
| **TC-04** | Venues | Search Venues by City | Venue #1 in Bhilwara | Call `GET /api/venues?city=Bhilwara` | Return array containing Venue #1 | Returned Venue #1 | `PASS` |
| **TC-05** | Venues | Fetch Venue Details | Venue #1 exists | Call `GET /api/venues/1` | Return nested details, gallery & facilities | Returned full venue object | `PASS` |
| **TC-06** | Compare | Client-Side Comparison | Venues selected | Add venue IDs to local storage & load `/compare` | Render side-by-side comparison table | Rendered comparison matrix | `PASS` |
| **TC-07** | Wishlist | Add Venue to Wishlist | Customer logged in | Call `POST /api/wishlist` with `venue_id=1` | Save wishlist item (`201 Created`) | Wishlist record created | `PASS` |
| **TC-08** | Wishlist | Reject Duplicate Wishlist Item | Item in wishlist | Call `POST /api/wishlist` with `venue_id=1` again | Return `409 Conflict` | Returned `409 Conflict` | `PASS` |
| **TC-09** | Wishlist | Delete Wishlist Item | Item in wishlist | Call `DELETE /api/wishlist/1` | Delete entry (`200 OK`) | Entry deleted | `PASS` |
| **TC-10** | Quotation | Customer Request Quote | Customer logged in | Call `POST /api/quotations` (Date, Guests) | Create quote request (`pending`) | Request #8 created (`pending`) | `PASS` |
| **TC-11** | Quotation | Owner Itemized Response | Pending quote exists | Call `POST /api/quotations/8/quote` (Item list) | Quote items saved, status `quoted` | Items saved, status `quoted` | `PASS` |
| **TC-12** | Quotation | Customer Accept Quote | Quote in `quoted` state | Call `POST /api/quotations/8/accept` | Update status to `accepted` | Status set `accepted` | `PASS` |
| **TC-13** | Booking | Book Accepted Quotation | Quote #8 `accepted` | Call `POST /api/bookings` with `quotation_id=8` | Booking #3 created (`confirmed`) | Created Booking #3 (₹205,000) | `PASS` |
| **TC-14** | Availability | Auto Date Protection | Booking #3 created | Query `availability` table for date `2026-11-15` | Date status updated to `booked` | Availability marked `booked` | `PASS` |
| **TC-15** | Availability | Double Booking Prevention | Date `2026-11-15` `booked` | Attempt booking on `2026-11-15` | Reject request with error | Request rejected | `PASS` |
| **TC-16** | Reviews | Review on Completed Booking | Booking #1 `completed` | Call `POST /api/reviews` (5★) | Save Review #1 | Review #1 saved (5★) | `PASS` |
| **TC-17** | Reviews | Reject Review on Confirmed Booking | Booking #3 `confirmed` | Call `POST /api/reviews` for Booking #3 | Return error (`400/403 Forbidden`) | Returned Error (Not Completed) | `PASS` |
| **TC-18** | Reviews | Out-of-Bounds Rating Limit | Customer logged in | Call `POST /api/reviews` with `rating=6` | Return validation error | Returned `400 Bad Request` | `PASS` |
| **TC-19** | Notifications | Fetch Unread Counter | User has unread alerts | Call `GET /api/notifications/unread-count` | Return integer unread count | Returned unread count | `PASS` |
| **TC-20** | Notifications | Mark All Read | Customer logged in | Call `PUT /api/notifications/read-all` | Set `is_read=TRUE` for user | All notifications set read | `PASS` |
| **TC-21** | Owner | Create Venue Listing | Owner logged in | Submit `POST /api/venues` | Create listing (`status='pending'`) | Created pending venue | `PASS` |
| **TC-22** | Admin | Customer Access Admin Stats | Logged in as Customer | Call `GET /api/admin/stats` | Reject call (`403 Forbidden`) | Returned `403 Forbidden` | `PASS` |
| **TC-23** | Admin | Admin Approve Venue | Pending venue exists | Call `PUT /api/admin/venues/1/status` | Update venue status to `approved` | Status set `approved` | `PASS` |
| **TC-24** | Security | Unauthenticated API Call | No JWT header | Call `GET /api/notifications` | Reject request (`401 Unauthorized`) | Returned `401 Unauthorized` | `PASS` |

---

## 3. Execution Summary

* **Total Test Cases Executed:** 24
* **Passed:** 24
* **Failed:** 0
* **Test Suite Pass Rate:** **100%**
