# Implementation Plan - Lunch Ordering App

## Project Goal
Create a lunch ordering web app for friends and family using Next.js, Mantine, and Google Authentication.

## Tech Stack
- **Framework**: Next.js 14+ (App Router)
- **UI Data**: @mantine/core (v7)
- **Auth**: NextAuth.js (Google Provider)
- **Database**: PostgreSQL (via Prisma ORM)
- **Payments**: Stripe
- **Styling**: Mantine CSS Modules / PostCSS

## Steps

### 1. Setup & Configuration
- [ ] Install dependencies (Mantine, NextAuth, Prisma, Stripe).
- [ ] Configure PostCSS (`postcss.config.mjs`) for Mantine.
- [ ] Setup `MantineProvider` in `app/layout.tsx`.
- [ ] Initialize Prisma (`npx prisma init`).
- [ ] Configure `.env` (Database URL, Google Client ID/Secret, Stripe Keys).

### 2. Database Schema
- [ ] Define `User` model (email, role, name).
- [ ] Define `Menu` model (date, options).
- [ ] Define `Order` model (userId, menuId, items, deliveryAddress, deliveryTime, stripePaymentId, status).
- [ ] Define `MenuItem` model (optional, or embedded in Menu).

### 3. Authentication
- [ ] Create `app/api/auth/[...nextauth]/route.ts`.
- [ ] implementation Google Provider.
- [ ] specific logic request for Admin role (e.g. whitelist or manual DB update).

### 4. UI Implementation
#### 4.1 Login Page
- [ ] Create a simple, elegant login page with "Sign in with Google".
- [ ] Redirect to `/menu` (User) or `/dashboard` (Admin) upon login.

#### 4.2 Menu View (User)
- [ ] Display menus for the next 3 days.
- [ ] Allow selection of a daily menu.
- [ ] "Order" button to proceed.

#### 4.3 Order Process
- [ ] Form for Delivery Info (Address, Time).
- [ ] Summary of order.
- [ ] Stripe Checkout Integration.

#### 4.4 Order History
- [ ] List user's past orders.
 
#### 4.5 Admin Dashboard
- [ ] Weekly Menu Editor (CRUD menus).
- [ ] Daily Order Summary (Table with counts).
- [ ] Orders Table (List of who ordered what + delivery info).

### 5. Styling & Polish
- [ ] Apply "premium" design aesthetics (Mantine theme, colors).
- [ ] Ensure responsive design.

### 6. Deployment Helper
- [ ] Instructions for Vercel/Neon/Supabase deployment.
