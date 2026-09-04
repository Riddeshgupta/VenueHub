# System Architecture (VenueHub)

## Overview
VenueHub is structured as a full-stack web application with a decoupled frontend and backend.

```
[ React Frontend ] <--- REST API (JWT Auth) ---> [ Python Flask Backend ] <---> [ MySQL Database ]
```

## Core User Workflows
1. **Customer**: Discover venues -> Compare pricing/quotations -> Request quote -> Check availability -> Book venue.
2. **Venue Owner**: List venue -> Manage availability & pricing -> Respond to quotes -> Confirm bookings.
3. **Admin**: Platform oversight -> Approve listings -> User management -> Audit & analytics.
