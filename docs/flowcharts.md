# VenueHub Key System Flowcharts

This document provides visual flowcharts using Mermaid syntax for 6 primary operational workflows within **VenueHub**.

---

## 1. Customer Booking Flow

```mermaid
flowchart TD
    A([Customer Browses Venues]) --> B{Filter by City, Capacity, Price}
    B --> C[Select Venue & View Details]
    C --> D[Click 'Request Quotation']
    D --> E[Enter Event Date, Guest Count & Notes]
    E --> F[Submit Quotation Request]
    F --> G[Wait for Owner Itemized Response]
    G --> H{Review Itemized Quotation}
    H -- Reject --> I([Quotation Status: Rejected])
    H -- Accept --> J[Click 'Accept Quotation']
    J --> K[Click 'Book Venue']
    K --> L{System Checks Date Availability}
    L -- Date Booked/Blocked --> M[Display Conflict Error]
    L -- Date Available --> N[Create Booking Record 'confirmed']
    N --> O[Update Availability Date to 'booked']
    O --> P[Generate Customer & Owner Notifications]
    P --> Q([Booking Confirmed!])
```

---

## 2. Quotation Processing Flow

```mermaid
flowchart TD
    A([Owner Receives Quotation Alert]) --> B[Open Owner Quotations Queue]
    B --> C[Select Pending Request]
    C --> D[Add Itemized Price Lines\n- Hall Rental\n- Catering\n- Decor\n- DJ / Taxes]
    D --> E[Submit Itemized Quotation]
    E --> F[System Calculates Total Amount]
    F --> G[Update Quotation Status to 'quoted']
    G --> H[Send Notification to Customer]
    H --> I{Customer Action}
    I -- Accepts --> J[Set Status to 'accepted'\nTrigger Notification to Owner]
    I -- Rejects --> K[Set Status to 'rejected'\nTrigger Notification to Owner]
    J --> L([Proceed to Booking])
    K --> M([Quotation Closed])
```

---

## 3. Venue Approval & Management Flow

```mermaid
flowchart TD
    A([Venue Owner Creates Listing]) --> B[Enter Name, Address, Capacity & Price]
    B --> C[Upload Image Gallery URLs]
    C --> D[Select Facilities & Supported Event Types]
    D --> E[Submit Listing]
    E --> F[System Sets Status: 'pending', Active: True]
    F --> G[Admin Inspects Pending Venues]
    G --> H{Admin Decision}
    H -- Approve --> I[Set Status to 'approved'\nSend Notification to Owner]
    H -- Reject --> J[Set Status to 'rejected'\nSend Notification to Owner]
    I --> K[Venue Appears in Public Search]
    J --> L[Venue Hidden from Public Search]
```

---

## 4. Availability Checking & Protection Flow

```mermaid
flowchart TD
    A([Customer Selects Date for Booking]) --> B[Query `availability` Table for (venue_id, date)]
    B --> C{Record Exists?}
    C -- No Record --> D[Date Available by Default]
    C -- Record Found --> E{Check Status Column}
    E -- 'booked' --> F[Block Booking Attempt - Return Error]
    E -- 'blocked' --> F
    E -- 'available' --> D
    D --> G[Create Booking Record]
    G --> H[Insert/Update `availability` SET status = 'booked']
    H --> I([Date Locked Successfully])
```

---

## 5. Review Submission Flow

```mermaid
flowchart TD
    A([Customer Attempts to Submit Review]) --> B[Query `bookings` Table for Customer & Venue]
    B --> C{Booking Exists & Status == 'completed'?}
    C -- No / Confirmed --> D[Reject Attempt: 'Review requires completed booking']
    C -- Yes --> E[Query `reviews` Table for booking_id]
    E --> F{Existing Review Found?}
    F -- Yes --> G[Reject Attempt: 'Review already submitted']
    F -- No --> H{Validate Rating Score}
    H -- Rating < 1 or > 5 --> I[Reject: 'Rating must be between 1 and 5']
    H -- 1 <= Rating <= 5 --> J[Insert Review into `reviews` Table]
    J --> K[Re-calculate Venue Aggregate Rating]
    K --> L([Review Saved & Displayed])
```

---

## 6. Authentication & Role Authorization Flow

```mermaid
flowchart TD
    A([Incoming HTTP Request]) --> B{Endpoint Protected?}
    B -- No (Public Route) --> C[Execute Controller Logic]
    B -- Yes --> D{Check 'Authorization' Header}
    D -- Missing / Invalid Format --> E[Return 401 Unauthorized]
    D -- Valid Bearer Format --> F[Extract & Decode JWT Token]
    F --> G{Token Valid & Not Expired?}
    G -- Invalid / Expired Signature --> E
    G -- Valid Token --> H[Extract user_id & role]
    H --> I{Check Role Permissions}
    I -- Role Unauthorized --> J[Return 403 Forbidden]
    I -- Role Authorized --> C
```
