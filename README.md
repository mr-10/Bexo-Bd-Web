# Bexo Reseller Website

This project is a reseller marketplace with a product catalog, customer login/signup, admin dashboard, cart, and order flow.

## Structure

- `backend/` - Express API server with authentication, product listing, orders, admin routes, and JSON persistence.
- `frontend/` - React + Vite app with product browsing, cart, checkout, user auth, and admin pages.

## Setup

1. Open two terminals.
2. Install backend dependencies:
   ```powershell
   cd E:\Work\bexo-reseller\backend
   npm install
   npm run dev
   ```
3. Install frontend dependencies:
   ```powershell
   cd E:\Work\bexo-reseller\frontend
   npm install
   npm run dev
   ```

## Demo Admin Login

- Email: `admin@bexo.com`
- Password: `Admin@123`

## Notes

- The admin route is available from the shared login page and can view registered users, password demo values, active sessions, and payout data.
- The frontend uses a white-and-blue theme for a clean reseller interface.
