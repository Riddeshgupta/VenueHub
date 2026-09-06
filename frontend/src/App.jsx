import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Venues from './pages/Venues';
import VenueDetails from './pages/VenueDetails';
import Compare from './pages/Compare';
import Dashboard from './pages/Dashboard';
import MyQuotations from './pages/MyQuotations';
import MyBookings from './pages/MyBookings';
import MyWishlist from './pages/MyWishlist';
import Notifications from './pages/Notifications';
import OwnerDashboard from './pages/OwnerDashboard';
import OwnerVenues from './pages/OwnerVenues';
import OwnerVenueManage from './pages/OwnerVenueManage';
import OwnerAvailability from './pages/OwnerAvailability';
import OwnerQuotations from './pages/OwnerQuotations';
import OwnerBookings from './pages/OwnerBookings';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminVenues from './pages/AdminVenues';
import AdminBookings from './pages/AdminBookings';
import AdminQuotations from './pages/AdminQuotations';
import AdminReviews from './pages/AdminReviews';
import Login from './pages/Login';
import Register from './pages/Register';

function App() {
  return (
    <Router>
      <Navbar />
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/venues" element={<Venues />} />
          <Route path="/venues/:venueId" element={<VenueDetails />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/quotations" element={<MyQuotations />} />
          <Route path="/dashboard/bookings" element={<MyBookings />} />
          <Route path="/dashboard/wishlist" element={<MyWishlist />} />
          <Route path="/dashboard/notifications" element={<Notifications />} />
          <Route path="/owner/dashboard" element={<OwnerDashboard />} />
          <Route path="/owner/venues" element={<OwnerVenues />} />
          <Route path="/owner/venues/:venueId/manage" element={<OwnerVenueManage />} />
          <Route path="/owner/venues/:venueId/availability" element={<OwnerAvailability />} />
          <Route path="/owner/quotations" element={<OwnerQuotations />} />
          <Route path="/owner/bookings" element={<OwnerBookings />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/venues" element={<AdminVenues />} />
          <Route path="/admin/bookings" element={<AdminBookings />} />
          <Route path="/admin/quotations" element={<AdminQuotations />} />
          <Route path="/admin/reviews" element={<AdminReviews />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </main>
      <Footer />
    </Router>
  );
}

export default App;
