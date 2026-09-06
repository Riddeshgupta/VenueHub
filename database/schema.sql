-- ============================================================
-- VenueHub MySQL Database Schema
-- Smart Venue Discovery, Comparison & Event Booking Platform
-- ============================================================

CREATE DATABASE IF NOT EXISTS venuehub;
USE venuehub;

-- ============================================================
-- DROP TABLES IN SAFE REVERSE DEPENDENCY ORDER
-- ============================================================
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS wishlist;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS quotation_items;
DROP TABLE IF EXISTS quotations;
DROP TABLE IF EXISTS availability;
DROP TABLE IF EXISTS venue_pricing;
DROP TABLE IF EXISTS venue_facilities;
DROP TABLE IF EXISTS facilities;
DROP TABLE IF EXISTS venue_event_types;
DROP TABLE IF EXISTS event_types;
DROP TABLE IF EXISTS venue_images;
DROP TABLE IF EXISTS venues;
DROP TABLE IF EXISTS users;

-- ============================================================
-- 1. USERS TABLE
-- Stores accounts for Customers, Venue Owners, and Admins
-- ============================================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role ENUM('customer', 'venue_owner', 'admin') NOT NULL DEFAULT 'customer',
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_role (role),
    INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 2. VENUES TABLE
-- Stores event venue listings created by Venue Owners
-- ============================================================
CREATE TABLE venues (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(20),
    capacity_min INT NOT NULL DEFAULT 0,
    capacity_max INT NOT NULL,
    base_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_venues_city (city),
    INDEX idx_venues_status (status),
    INDEX idx_venues_capacity (capacity_min, capacity_max),
    INDEX idx_venues_price (base_price),
    INDEX idx_venues_owner (owner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 3. VENUE_IMAGES TABLE
-- Stores image gallery for venues
-- ============================================================
CREATE TABLE venue_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    venue_id INT NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    caption VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE,
    INDEX idx_venue_images_venue (venue_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 4. EVENT_TYPES TABLE
-- Master lookup table for supported event types (Wedding, Birthday, etc.)
-- ============================================================
CREATE TABLE event_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 5. VENUE_EVENT_TYPES TABLE (Junction Table)
-- Maps many-to-many relationship between Venues and Event Types
-- ============================================================
CREATE TABLE venue_event_types (
    venue_id INT NOT NULL,
    event_type_id INT NOT NULL,
    PRIMARY KEY (venue_id, event_type_id),
    FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE,
    FOREIGN KEY (event_type_id) REFERENCES event_types(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 6. FACILITIES TABLE
-- Master lookup table for venue amenities (AC, Parking, Catering, etc.)
-- ============================================================
CREATE TABLE facilities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    icon VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 7. VENUE_FACILITIES TABLE (Junction Table)
-- Maps many-to-many relationship between Venues and Facilities
-- ============================================================
CREATE TABLE venue_facilities (
    venue_id INT NOT NULL,
    facility_id INT NOT NULL,
    PRIMARY KEY (venue_id, facility_id),
    FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE,
    FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 8. VENUE_PRICING TABLE
-- Stores detailed pricing components for venues
-- ============================================================
CREATE TABLE venue_pricing (
    id INT AUTO_INCREMENT PRIMARY KEY,
    venue_id INT NOT NULL,
    pricing_type ENUM('venue_rental', 'food_per_person', 'decoration', 'dj_music', 'parking', 'other', 'tax') NOT NULL,
    item_name VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    is_optional BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE,
    INDEX idx_venue_pricing_venue (venue_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 9. AVAILABILITY TABLE
-- Tracks venue date availability and blockages
-- ============================================================
CREATE TABLE availability (
    id INT AUTO_INCREMENT PRIMARY KEY,
    venue_id INT NOT NULL,
    date DATE NOT NULL,
    status ENUM('available', 'booked', 'blocked') NOT NULL DEFAULT 'available',
    notes VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_venue_date (venue_id, date),
    FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE,
    INDEX idx_availability_search (venue_id, date, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 10. QUOTATIONS TABLE
-- Manages quotation requests from Customers and responses from Venue Owners
-- ============================================================
CREATE TABLE quotations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    venue_id INT NOT NULL,
    event_type_id INT,
    event_date DATE NOT NULL,
    guest_count INT NOT NULL,
    message TEXT,
    total_amount DECIMAL(10, 2) DEFAULT 0.00,
    status ENUM('pending', 'quoted', 'accepted', 'rejected', 'expired') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE,
    FOREIGN KEY (event_type_id) REFERENCES event_types(id) ON DELETE SET NULL,
    INDEX idx_quotations_customer (customer_id),
    INDEX idx_quotations_venue (venue_id),
    INDEX idx_quotations_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 11. QUOTATION_ITEMS TABLE
-- Detailed line-item breakdown inside a quotation
-- ============================================================
CREATE TABLE quotation_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quotation_id INT NOT NULL,
    item_name VARCHAR(150) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    quantity INT NOT NULL DEFAULT 1,
    total_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
    INDEX idx_quotation_items_quotation (quotation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 12. BOOKINGS TABLE
-- Stores finalized venue bookings
-- ============================================================
CREATE TABLE bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    venue_id INT NOT NULL,
    quotation_id INT,
    event_date DATE NOT NULL,
    guest_count INT NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    advance_paid DECIMAL(10, 2) DEFAULT 0.00,
    status ENUM('confirmed', 'completed', 'cancelled') NOT NULL DEFAULT 'confirmed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE,
    FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE SET NULL,
    INDEX idx_bookings_customer (customer_id),
    INDEX idx_bookings_venue (venue_id),
    INDEX idx_bookings_status (status),
    INDEX idx_bookings_event_date (event_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 13. REVIEWS TABLE
-- Customer reviews and ratings post-booking
-- ============================================================
CREATE TABLE reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    venue_id INT NOT NULL,
    customer_id INT NOT NULL,
    booking_id INT UNIQUE,
    rating TINYINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
    INDEX idx_reviews_venue (venue_id),
    INDEX idx_reviews_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 14. WISHLIST TABLE
-- Saved favorite venues per customer
-- ============================================================
CREATE TABLE wishlist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    venue_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_customer_venue (customer_id, venue_id),
    FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE,
    INDEX idx_wishlist_customer (customer_id),
    INDEX idx_wishlist_venue (venue_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 15. NOTIFICATIONS TABLE
-- Platform alerts and status notifications for users
-- ============================================================
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notifications_user_read (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
