

# AI Services Marketplace — User Panel (Phase 1)

## Overview
A premium fintech-style AI services marketplace with wallet system, package purchases, referral commissions, and team management. Built with Supabase for auth, database, and real-time functionality. Orange & teal color palette on white background.

---

## 1. Design System & Theme
- Custom color palette: orange primary accents, teal secondary accents, green/red for success/error states
- Soft gradients, rounded cards with light shadows
- Loading skeletons for all data-fetching states
- Fully responsive layout with sidebar navigation (collapsible on mobile)
- Consistent typography with professional spacing

## 2. Authentication
- **Login** page with email/password
- **Register** page with referral code field (optional, auto-filled from URL)
- **Forgot password** flow with email reset
- **Email verification** after signup
- User profiles table with display name, phone, avatar
- Protected routes — redirect unauthenticated users to login

## 3. Dashboard
- Welcome greeting with user's name
- Stat cards showing: Wallet Balance, Total Deposits, Total Withdrawals, Total Commissions
- Active AI packages summary
- Recent activity feed (last 5 transactions)
- Quick action buttons (Deposit, Browse Packages)

## 4. Wallet System
- **Deposit page**: Amount input, payment method selection (Bank Transfer, Crypto, Credit Card), submit deposit request (pending admin approval)
- **Withdraw page**: Amount input, select saved bank account, submit withdrawal request
- Balance display with pending amounts shown separately
- All deposit/withdrawal requests stored in database with status tracking (pending → approved/rejected)

## 5. AI Packages Mall
- Grid of package cards showing: name, description, features list (queries, storage, GPU, etc.), price (one-time & monthly options), cashback/bonus badges
- Package detail view
- Buy package flow (deducts from wallet balance)
- **My Packages** tab showing active subscriptions with expiry dates and renewal status

## 6. Transactions
- Tabbed view: All, Deposits, Withdrawals, Purchases, Commissions
- Each row shows: date, type, amount, status badge (success/pending/failed), description
- Filters by date range and status
- Pagination for large lists

## 7. Team / Referral System
- Unique referral link with copy button
- Tier-based team view (Tier 1 = direct referrals, Tier 2 = their referrals, Tier 3 = one more level)
- Table per tier showing: Member ID, join date, total consumption, commission earned
- Total team stats summary

## 8. Profile & Settings
- Edit profile (name, phone, avatar)
- Change password
- Manage bank details (add/edit bank name, account number, IBAN)
- Language selector (UI only for now)
- About us, Contact support, Logout
- Download app placeholder

## 9. Database Structure (Supabase)
- `profiles` — user profile data
- `bank_accounts` — user saved bank details
- `wallets` — user balances
- `deposit_requests` — deposit submissions with status
- `withdrawal_requests` — withdrawal submissions with status
- `ai_packages` — available packages (seeded with realistic data)
- `user_packages` — purchased/active subscriptions
- `transactions` — unified transaction log
- `referrals` — referral relationships (who referred whom)
- `commissions` — commission records per tier
- `user_roles` — role-based access (user/admin)
- Row-Level Security on all tables

## 10. Seed Data
- 5-6 realistic AI packages (e.g., "AI Starter", "Business Pro", "Enterprise GPU", etc.)
- Realistic pricing, features, and cashback percentages
- Sample transactions and activity for logged-in user

---

> **Phase 2 (later):** Admin panel with user management, withdrawal approvals, package CRUD, commission configuration, and content management.

