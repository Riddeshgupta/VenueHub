# VenueHub Data Flow Diagrams (DFD)

This document provides Level 0 (Context Level) and Level 1 (Functional Decomposition) Data Flow Diagrams for **VenueHub**.

---

## 1. Level 0 Data Flow Diagram (Context Level)

The Level 0 DFD illustrates the overall system boundaries of VenueHub, detailing the data exchanges between external entities (**Customer**, **Venue Owner**, **Admin**) and the central **VenueHub System**, backed by the **MySQL Data Store**.

```mermaid
graph TD
    Customer["Customer (User External Entity)"]
    Owner["Venue Owner (User External Entity)"]
    Admin["Administrator (User External Entity)"]

    System(("1.0 VenueHub System"))

    Database[("MySQL Data Store")]

    %% Customer Data Flows
    Customer -->|1. Credentials / Reg Details| System
    Customer -->|2. Search Filters & Wishlist Items| System
    Customer -->|3. Quotation Request & Acceptance| System
    Customer -->|4. Booking Details & Reviews| System

    System -->|5. JWT Token & Venue Listings| System
    System -->|6. Itemized Quotes & Notifications| System
    System -->|7. Booking Confirmations| Customer

    %% Owner Data Flows
    Owner -->|8. Credentials & Venue Details| System
    Owner -->|9. Pricing, Amenities & Availability| System
    Owner -->|10. Itemized Quotation Responses| System

    System -->|11. Inquiries, Notifications & Booking Reports| Owner

    %% Admin Data Flows
    Admin -->|12. Venue Approval / Account Status Toggles| System
    System -->|13. Platform Analytics & User / Venue Logs| Admin

    %% Database Flows
    System <-->|Read / Write Relational Records| Database
```

---

## 2. Level 1 Data Flow Diagram (Functional Decomposition)

The Level 1 DFD decomposes the VenueHub System into 8 primary functional sub-processes:

```mermaid
graph TD
    %% Entities
    C["Customer"]
    O["Venue Owner"]
    A["Admin"]

    %% Processes
    P1(("1.1 Authentication & Authorization"))
    P2(("1.2 Venue Discovery & Search"))
    P3(("1.3 Listing & Pricing Management"))
    P4(("1.4 Quotation Management"))
    P5(("1.5 Booking & Availability Locking"))
    P6(("1.6 Review & Rating Management"))
    P7(("1.7 Wishlist & Compare"))
    P8(("1.8 Platform Administration"))

    %% Data Stores
    D1[("D1 Users Store")]
    D2[("D2 Venues & Pricing Store")]
    D3[("D3 Quotations Store")]
    D4[("D4 Bookings & Availability Store")]
    D5[("D5 Reviews Store")]
    D6[("D6 Wishlist Store")]
    D7[("D7 Notifications Store")]

    %% P1 Flows
    C -->|Login / Register| P1
    O -->|Login / Register| P1
    A -->|Login| P1
    P1 <-->|Verify / Save User| D1
    P1 -->|Issue JWT Token| C
    P1 -->|Issue JWT Token| O
    P1 -->|Issue JWT Token| A

    %% P2 Flows
    C -->|City / Capacity / Price Filters| P2
    P2 <-->|Fetch Approved & Active Venues| D2
    P2 -->|Venue Cards & Details| C

    %% P3 Flows
    O -->|Create / Update Venue, Price & Amenities| P3
    P3 <-->|Save Listing Data| D2

    %% P4 Flows
    C -->|Submit Quote Request| P4
    P4 <-->|Save / Fetch Requests| D3
    P4 -->|Alert New Request| D7
    O -->|Submit Itemized Quote| P4
    P4 -->|Alert Quote Ready| D7
    C -->|Accept / Reject Quote| P4

    %% P5 Flows
    C -->|Confirm Booking| P5
    P5 <-->|Verify & Lock Date| D4
    P5 -->|Update Date Status to 'booked'| D4
    P5 -->|Alert Booking Confirmation| D7

    %% P6 Flows
    C -->|Submit 1-5 Star Review| P6
    P6 <-->|Verify Completed Booking| D4
    P6 -->|Save Verified Review| D5

    %% P7 Flows
    C -->|Toggle Wishlist Item| P7
    P7 <-->|Save / Delete Saved Venues| D6

    %% P8 Flows
    A -->|Approve Venue / Disable User| P8
    P8 <-->|Update Listing & Account Status| D2
    P8 <-->|Fetch System Metrics| D1
```
