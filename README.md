# VenueHub: Smart Venue Discovery, Comparison & Event Booking Platform

**Tagline:** Discover • Compare • Quote • Book  
**Domain:** Web Application / Software Engineering / Multi-Vendor Marketplace  
**License:** Academic / Open Source  

---

## 📌 Project Overview

**VenueHub** is an end-to-end multi-vendor venue marketplace designed to digitize and automate event space selection, pricing quotation, date availability management, and venue booking. Built with a decoupled architecture featuring a **React 19** frontend, **Python Flask** REST API backend, and **MySQL 8.0** database, VenueHub connects event organizers with venue managers seamlessly.

---

## 🌟 Key Features

* **Multi-Criteria Search Engine:** Filter public venues by city, minimum/maximum guest capacity, event type, and base price limits.
* **Side-by-Side Venue Compare:** Compare up to 3 selected venues side-by-side across pricing, location, capacities, and facilities.
* **Customer Wishlist:** Save favorite venue listings to a personal customer account wishlist.
* **Itemized Quotation Workflow:** Customers submit quote inquiries specifying date and guest count; venue owners respond with itemized cost breakdowns (rental, catering, decoration, audio/visual).
* **Automated Booking & Date Protection:** Confirming an accepted quotation automatically locks the venue's calendar date to `booked`, blocking duplicate reservations.
* **Verified Post-Booking Reviews:** Restricts review submission (1–5 stars and comments) strictly to customers with verified completed bookings.
* **Real-Time Notifications:** Notification alerts for quotation creation, owner price responses, quote acceptances, and booking confirmations.
* **Admin Governance:** Comprehensive dashboard to approve/reject new venue listings, toggle venue visibility, and manage user accounts.

---

## 🛠️ Technology Stack

* **Frontend:** React (v19.2.8), React Router DOM (v7.18.3), Axios (v1.20.0), Vanilla CSS3, Vite (v8.2.2)
* **Backend:** Python (v3.12.0), Flask (v3.1.3), Flask-CORS (v6.0.5)
* **Database:** MySQL (v8.0+) with PyMySQL (v1.2.0) driver, 15 Relational InnoDB Tables
* **Authentication & Hashing:** PyJWT (v2.13.0) and bcrypt (v5.0.0)

---

## 📁 Project Structure

```text
VenueHub/
├── backend/                  # Python Flask REST API Service
│   ├── app/
│   │   ├── __init__.py       # Application factory & Blueprint registration
│   │   ├── database.py       # PyMySQL database connection management
│   │   └── routes/           # REST API blueprint routes (auth, venues, quotations, etc.)
│   ├── requirements.txt      # Python dependencies
│   └── run.py                # Server entry point
├── database/                 # MySQL Database Management
│   ├── schema.sql            # Master schema (15 InnoDB tables with constraints)
│   └── README.md             # Database import instructions
├── docs/                     # Project Documentation & Viva Preparation
│   ├── project-documentation.md # 39-Section Academic Project Report
│   ├── er-diagram.md         # Entity-Relationship Documentation & Mermaid Diagram
│   ├── system-architecture.md# 3-Tier Architecture & Sequence Diagrams
│   ├── dfd.md                # Level 0 & Level 1 Data Flow Diagrams
│   ├── flowcharts.md         # Flowcharts for 6 Key Workflows
│   ├── api-documentation.md  # Complete REST API Specifications
│   ├── security.md           # Security, JWT, bcrypt & RBAC Documentation
│   ├── test-cases.md         # Master Test Cases & Verification Results Log
│   ├── presentation-content.md# 15-Slide Presentation Blueprint & Speaker Notes
│   ├── demo-script.md        # 10-15 Minute Live Presentation Demo Script
│   ├── viva-questions.md     # 50+ Viva Q&A Bank across 25 Categories
│   └── screenshot-checklist.md # 17 Screenshots Checklist for Reports
├── frontend/                 # React Single Page Application (SPA)
│   ├── src/
│   │   ├── components/       # Reusable UI components (Navbar, Footer, Modals)
│   │   ├── pages/            # Page view controllers (Home, Venues, Compare, Dashboards)
│   │   ├── services/         # Axios API HTTP client config
│   │   └── utils/            # Auth & JWT helpers
│   ├── package.json          # Frontend dependencies
│   └── vite.config.js        # Vite bundler configuration
└── README.md                 # Root Project Readme
```

---

## 🚀 Quick Setup & Installation Guide

### Prerequisites
* **Node.js:** v18.0+ & npm
* **Python:** v3.10+
* **MySQL Server:** v8.0+

---

### 1. Database Setup
1. Open terminal and log into MySQL CLI:
   ```bash
   mysql -u root -p
   ```
2. Import the schema file:
   ```sql
   SOURCE database/schema.sql;
   ```
   *(Creates database `venuehub` and 15 relational tables).*

---

### 2. Backend Setup (Flask API)
1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file in `backend/`:
   ```env
   FLASK_APP=run.py
   FLASK_ENV=development
   SECRET_KEY=your_jwt_secret_key_here
   DB_HOST=127.0.0.1
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=venuehub
   DB_PORT=3306
   ```
5. Start the Flask REST API server:
   ```bash
   python run.py
   ```
   *(Server starts at `http://127.0.0.1:5000/`)*.

---

### 3. Frontend Setup (React SPA)
1. Open a new terminal and navigate to `frontend/`:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *(Application opens at `http://localhost:5173/`)*.

---

## 🧪 Testing & Verification

* **Master Test Suite Execution:**
  ```bash
  python scratch/test_stage10_master.py
  ```
  *(Verifies auth, RBAC guards, quotation processing, booking creation, date protection, wishlist, notifications, and admin APIs with a 100% pass rate).*

* **Production Build Verification:**
  ```bash
  cd frontend
  npm run build
  ```
  *(Compiles production assets into `frontend/dist` with 0 build errors).*

---

## 📄 Academic Project Documentation

All detailed project reports, ER diagrams, system flowcharts, DFDs, REST API specifications, security specs, test logs, presentation slides, live demo scripts, and viva Q&A banks are located in the [`docs/`](./docs/) directory.
