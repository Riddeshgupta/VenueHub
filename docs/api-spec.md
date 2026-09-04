# REST API Specification (VenueHub)

## Authentication Endpoints (JWT)
- `POST /api/auth/register` - User registration (Customer / Venue Owner)
- `POST /api/auth/login` - User login & token issuance

## Venue Endpoints
- `GET /api/venues` - Search & filter venues
- `GET /api/venues/:id` - Venue detail view
- `POST /api/venues` - Create venue (Venue Owner)

## Quotation & Booking Endpoints
- `POST /api/quotations` - Request quotation (Customer)
- `GET /api/quotations` - Manage quotation requests
- `POST /api/bookings` - Create booking
