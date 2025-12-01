# FinSight Production Readiness Plan

## Overview
This plan outlines all tasks required to make FinSight a fully functional, production-ready financial intelligence dashboard.

---

## Phase 1: Firebase Core Setup (Foundation) ✅ COMPLETED

### 1.1 Firebase Configuration
- [x] Install Firebase SDK (`npm install firebase`)
- [x] Create `/services/firebase.ts` with provided config
- [x] Initialize Firebase App, Auth, Firestore, and Analytics
- [x] Updated `index.html` import map with Firebase dependencies
- [x] Updated `package.json` with all dependencies

### 1.2 Authentication Service
- [x] Create `/services/authService.ts` with functions:
  - `signIn(email, password)`
  - `signUp(email, password, name)`
  - `signOut()`
  - `resetPassword(email)`
  - `signInWithGoogle()`
  - `subscribeToAuthChanges(callback)`
- [x] Create `/contexts/AuthContext.tsx` for global auth state
- [x] useAuth hook exported from AuthContext
- [x] Create `/components/ProtectedRoute.tsx` wrapper

### 1.3 Update Authentication Flow
- [x] Update `Login.tsx` to use real Firebase Auth
- [x] Create `Register.tsx` page for new user signup
- [x] Add password reset flow to Login page
- [x] Add Google Sign-In option
- [x] Wrap app routes with `ProtectedRoute` in `App.tsx`
- [x] Update `Layout.tsx` logout to use `authService.signOut()`
- [x] Add `react-hot-toast` for notifications

---

## Phase 2: Database & Data Layer ✅ COMPLETED

### 2.1 Firestore Setup
- [x] Create `/services/firestoreService.ts` with CRUD operations
- [x] Define Firestore collections structure:
  ```
  users/{userId} - User profiles
  transactions/{id} - Financial transactions
  subscriptions/{id} - SaaS subscriptions
  forecasts/{id} - AI-generated forecasts
  partners/{id} - Profit share partners
  distributions/{id} - Distribution records
  settings/{userId} - User preferences
  ```
- [x] Create Firestore security rules file (`firestore.rules`)

### 2.2 TypeScript Models
- [x] Update `/types.ts` with complete interfaces:
  - `User` (with Firestore fields)
  - `Transaction` (with userId, timestamps, TransactionCategory)
  - `Subscription` (with userId, timestamps)
  - `Forecast` & `ForecastDataPoint` (with scenario data)
  - `Partner` (for profit sharing)
  - `Distribution` (for tracking distributions)
  - `UserSettings` (preferences)
  - Input types for forms (TransactionInput, SubscriptionInput, PartnerInput)

### 2.3 Data Hooks (Replace Mock Data)
- [x] Create `/hooks/useTransactions.ts` - Fetch transactions + useCashFlow + usePnL
- [x] Create `/hooks/useSubscriptions.ts` - Fetch subscriptions with metrics
- [x] Create `/hooks/usePartners.ts` - Fetch partners + distributions

---

## Phase 3: Page Updates (Connect to Firebase) ✅ COMPLETED

### 3.1 Dashboard Page
- [x] Replace `MOCK_CASH_FLOW` with real transaction aggregation
- [x] Calculate KPI metrics from Firestore data:
  - Total Revenue (sum of revenue transactions)
  - Total Expenses (sum of expense transactions)
  - Net Profit (revenue - expenses)
  - Burn Rate (monthly expense average)
- [x] Add loading states and error handling
- [x] Implement real-time updates with Firestore listeners

### 3.2 P&L Page
- [x] Replace hardcoded P&L data with transaction queries
- [x] Group transactions by category for breakdown
- [x] Calculate percentages dynamically
- [x] Add date range filter (this month, last month, YTD, custom)
- [x] Add export to CSV functionality

### 3.3 Manual Entry Page
- [x] Install form validation (`npm install zod react-hook-form`)
- [x] Create validation schema for transaction form
- [x] Implement actual Firestore submission
- [x] Add success/error toast notifications
- [ ] Implement receipt upload to Firebase Storage (deferred to Phase 5)
- [ ] Add draft saving functionality (deferred to Phase 5)

### 3.4 Subscriptions Page
- [x] Replace `MOCK_SUBSCRIPTIONS` with Firestore data
- [x] Add CRUD operations (add, edit, delete subscriptions)
- [x] Implement subscription form with validation
- [x] Calculate monthly/annual run rate from real data
- [x] Add renewal reminders logic

### 3.5 Profit Share Page
- [x] Replace hardcoded directors with Firestore partners
- [x] Add partner management (add, edit, remove partners)
- [x] Implement distribution calculation from real profit
- [x] Add distribution history tracking
- [x] Create distribution record on "Distribute" action

### 3.6 Forecast Page
- [x] Create `/services/geminiService.ts` for AI integration
- [x] Implement `generateForecast()` function calling Gemini API
- [x] Send historical transaction data for analysis
- [x] Parse and display AI-generated projections
- [x] Add scenario comparison (base/optimistic/conservative)
- [x] Handle API errors gracefully with fallback
- [ ] Store forecasts in Firestore (optional enhancement)

### 3.7 Settings Page
- [x] Implement user profile display
- [x] Add data export (JSON/CSV) for transactions
- [ ] Implement user profile editing (deferred to Phase 5)
- [ ] Save preferences to Firestore (deferred to Phase 5)
- [ ] Add data import functionality (deferred to Phase 5)
- [ ] Placeholder for Plaid integration (Phase 5)

---

## Phase 4: Form Validation & Error Handling ✅ COMPLETED

### 4.1 Validation Schemas
- [x] Create `/lib/validations.ts` with all schemas:
  - loginSchema, registerSchema, resetPasswordSchema
  - transactionSchema
  - subscriptionSchema
  - partnerSchema, distributionSchema
  - userSettingsSchema

### 4.2 Error Handling
- [x] Create `/components/ErrorBoundary.tsx`
- [x] Install toast library (`npm install react-hot-toast`)
- [x] Add toast notifications for all actions
- [x] Wrap app with ErrorBoundary in `App.tsx`

### 4.3 Loading States
- [x] Create `/components/ui/Loading.tsx` with:
  - Spinner component (sm, md, lg sizes)
  - LoadingOverlay component
  - PageLoader component
  - CardSkeleton component
  - TableSkeleton component
  - ChartSkeleton component
  - EmptyState component
- [x] Add loading states to all data-fetching pages
- [x] Add button loading states during form submission

---

## Phase 5: Additional Features ✅ COMPLETED

### 5.1 Receipts Management
- [x] Create `/pages/Receipts.tsx` page
- [x] Add route in `App.tsx`
- [x] Create `/services/storageService.ts` for Firebase Storage
- [x] Create `/hooks/useReceipts.ts` for receipt management
- [x] Implement image upload to Firebase Storage
- [x] Add receipt viewer/gallery with drag & drop

### 5.2 AI Forecasting
- [x] Create `/services/geminiService.ts` for Gemini AI
- [x] Add `@google/generative-ai` SDK to dependencies
- [x] Implement forecast generation with fallback
- [x] Create `.env.example` for API keys

### 5.3 Notifications & Alerts (Future Enhancement)
- [ ] Create alerts for upcoming bill payments
- [ ] Add subscription renewal notifications
- [ ] Implement budget threshold alerts
- [ ] Create notification preferences in Settings

### 5.4 Data Connections (Plaid) - Optional
- [ ] Create Plaid developer account
- [ ] Install Plaid SDK
- [ ] Create `/services/plaidService.ts`
- [ ] Implement bank connection flow
- [ ] Auto-import transactions from connected banks
- [ ] Add connection status to Settings

---

## Phase 6: Testing & Quality ✅ COMPLETED

### 6.1 Testing Setup
- [x] Install testing libraries (`vitest`, `@testing-library/react`, `jsdom`)
- [x] Configure Vitest in `vite.config.ts`
- [x] Create test setup file with mocks (`tests/setup.ts`)
- [x] Add test scripts to `package.json`

### 6.2 Unit Tests
- [x] Test validation schemas (`tests/validations.test.ts`)
- [x] Test calculation utilities (`tests/utils.test.ts`)
- [ ] Test auth service functions (future)
- [ ] Test Firestore service functions (future)

### 6.3 Component Tests (Future Enhancement)
- [ ] Test form components
- [ ] Test authentication flow
- [ ] Test protected routes

---

## Phase 7: Deployment & Production ✅ COMPLETED

### 7.1 Build & Configuration
- [x] Create `firebase.json` for Firebase Hosting
- [x] Create `.firebaserc` with project configuration
- [x] Create `firestore.indexes.json` for database indexes
- [x] Create `storage.rules` for Firebase Storage security
- [x] Update `firestore.rules` with production-ready validation
- [x] Update `.gitignore` for Firebase and env files

### 7.2 CI/CD Pipeline
- [x] Create `.github/workflows/firebase-deploy.yml`
- [x] Configure build and test jobs
- [x] Set up preview deployments for PRs
- [x] Set up production deployment on main branch
- [x] Add automatic rules deployment

### 7.3 Environment Configuration
- [x] Update `services/firebase.ts` to use environment variables
- [x] Create `.env.example` template for developers
- [x] Configure secrets for GitHub Actions

### 7.4 Monitoring (Future Enhancement)
- [ ] Set up Firebase Analytics events
- [ ] Add error tracking (Sentry optional)
- [ ] Configure performance monitoring

---

## Files to Create

```
/services/
  ├── firebase.ts          # Firebase initialization
  ├── authService.ts       # Authentication functions
  ├── firestoreService.ts  # Database operations
  └── geminiService.ts     # AI forecast generation

/contexts/
  └── AuthContext.tsx      # Global auth state

/hooks/
  ├── useAuth.ts           # Auth hook
  ├── useTransactions.ts   # Transaction data
  ├── useSubscriptions.ts  # Subscription data
  ├── useCashFlow.ts       # Cash flow metrics
  └── usePartners.ts       # Profit share partners

/schemas/
  ├── transactionSchema.ts
  ├── subscriptionSchema.ts
  └── authSchemas.ts

/components/
  ├── ProtectedRoute.tsx   # Route protection
  ├── ErrorBoundary.tsx    # Error handling
  ├── LoadingSpinner.tsx   # Loading indicator
  └── Toast.tsx            # Notifications

/pages/
  ├── Register.tsx         # New user signup
  └── Receipts.tsx         # Receipt management

/utils/
  ├── errorHandler.ts      # Error utilities
  └── calculations.ts      # Financial calculations
```

---

## Dependencies to Install

```bash
# Core
npm install firebase zod react-hook-form

# UI & Notifications
npm install react-hot-toast

# Date handling
npm install date-fns

# Optional - Data fetching
npm install @tanstack/react-query
```

---

## Firebase Configuration Reference

```typescript
// Your Firebase config (provided)
const firebaseConfig = {
  apiKey: "AIzaSyAlg2VBO7f65LdMjqg5zH8Ca6OsZHFjPi8",
  authDomain: "velo-479115.firebaseapp.com",
  projectId: "velo-479115",
  storageBucket: "velo-479115.firebasestorage.app",
  messagingSenderId: "341467003750",
  appId: "1:341467003750:web:cde4c7ffc428b647d166a7",
  measurementId: "G-T7FGHZGETP"
};
```

---

## Priority Order

1. **Phase 1** - Firebase & Auth (Start here - everything depends on this)
2. **Phase 2** - Database layer (Required for any real functionality)
3. **Phase 3** - Page updates (Make the app actually work)
4. **Phase 4** - Validation & errors (Polish and reliability)
5. **Phase 5** - Additional features (Nice to have)
6. **Phase 6** - Testing (Quality assurance)
7. **Phase 7** - Deployment (Go live)

---

## Estimated Effort

| Phase | Tasks | Estimate |
|-------|-------|----------|
| Phase 1 | Firebase & Auth | 8-12 hours |
| Phase 2 | Database Layer | 6-10 hours |
| Phase 3 | Page Updates | 20-30 hours |
| Phase 4 | Validation & Errors | 6-8 hours |
| Phase 5 | Additional Features | 10-15 hours |
| Phase 6 | Testing | 10-15 hours |
| Phase 7 | Deployment | 4-6 hours |
| **Total** | | **64-96 hours** |
