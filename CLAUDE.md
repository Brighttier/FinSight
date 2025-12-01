# FinSight

Internal financial intelligence dashboard for startup management featuring P&L tracking, expense management, financial forecasting, and profit distribution.

## Quick Start

```bash
npm install          # Install dependencies
npm run dev          # Start dev server on port 3000
npm run build        # Production build
npm run preview      # Preview production build
```

## Tech Stack

- **Frontend:** React 19, TypeScript 5.8, Vite 6
- **Styling:** Tailwind CSS 3 (via CDN)
- **Charts:** Recharts
- **Icons:** Lucide React
- **Routing:** React Router DOM (HashRouter)
- **AI:** Gemini API (configured via GEMINI_API_KEY in .env.local)

## Project Structure

```
├── App.tsx                 # Main routing and layout wrapper
├── index.tsx               # React entry point
├── types.ts                # TypeScript type definitions
├── components/
│   ├── Layout.tsx          # Sidebar navigation and app shell
│   └── ui/Card.tsx         # Reusable card components
├── pages/
│   ├── Dashboard.tsx       # KPI metrics, cash flow chart, AI insights
│   ├── Login.tsx           # Authentication page
│   ├── PnL.tsx             # Profit & Loss statement
│   ├── Forecast.tsx        # AI-powered financial projections
│   ├── ManualEntry.tsx     # Transaction entry form
│   ├── Subscriptions.tsx   # SaaS subscription management
│   ├── ProfitShare.tsx     # Partner profit distribution
│   └── Settings.tsx        # Configuration and data connections
└── services/
    └── mockData.ts         # Development mock data
```

## Routes

| Path | Page | Description |
|------|------|-------------|
| `/` | Login | Authentication |
| `/dashboard` | Dashboard | Main overview with KPIs |
| `/pnl` | P&L | Revenue/expense breakdown |
| `/costs/new` | ManualEntry | Add transactions |
| `/forecast` | Forecast | AI financial projections |
| `/subscriptions` | Subscriptions | SaaS tracker |
| `/profit-share` | ProfitShare | Partner distribution |
| `/settings` | Settings | App configuration |

## Key Types

```typescript
Transaction { id, date, description, category, amount, type: 'revenue'|'expense', status: 'draft'|'posted' }
Subscription { id, vendor, cost, billingCycle: 'monthly'|'annual', nextBillingDate, status, savingsOpportunity? }
User { uid, email, name, role: 'director'|'employee'|'contractor' }
```

## Development Notes

- Uses mock data in `services/mockData.ts` - no backend connected yet
- No real authentication implemented - Login page is UI only
- Gemini API configured but showing placeholder responses
- Path alias `@/*` maps to project root
- All styling via Tailwind utility classes

## Environment Variables

Create `.env.local` with:
```
GEMINI_API_KEY=your_api_key_here
```
