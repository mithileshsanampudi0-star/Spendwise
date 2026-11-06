# SpendWise API

Base path `/api`. JSON in, JSON out: `{ success: true, data, ... }` or `{ success: false, message, errors? }`.

**Auth**: an httpOnly cookie (`sw_token`) set by login, register and demo. API clients may send `Authorization: Bearer <jwt>` instead.
Requests authenticated by cookie that change data (`POST/PUT/DELETE`) must include `X-Requested-With: SpendWise`.
Optional `X-Client-Date: YYYY-MM-DD` tells the server the user's local "today".

Status codes: `400` validation, `401` not signed in, `403` missing CSRF header, `404` not found *or not yours*, `409` duplicate, `422` could not parse, `429` rate limited.

## Auth

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/auth/register` | `{ name, email, password, currency? }` |
| POST | `/auth/login` | `{ email, password }`. 10 failed attempts / 15 min |
| POST | `/auth/demo` | Creates a private demo account (sample data, expires in 24h) |
| POST | `/auth/logout` | Clears the cookie |
| GET | `/auth/me` | Current user; renews the cookie when under 3 days remain |
| PUT | `/auth/me` | `{ name?, currency? }` |
| PUT | `/auth/password` | `{ currentPassword, newPassword }`; signs out other sessions |
| POST | `/auth/forgot-password` | `{ email }`. Same response whether or not the account exists |
| POST | `/auth/reset-password` | `{ token, password }`. Token is single-use, valid 30 minutes |

## Expenses and income

Same shape for `/expenses` and `/income` (income uses `category` as the source: Salary, Freelance, Business, Investments, Gift, Refund, Other; no `paymentMethod`).

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/expenses` | Query: `search, category, from, to, sortBy=date|amount, order, page, limit` → `{ data, pagination, summary.totalAmount }` |
| POST | `/expenses` | `{ title, amount>0, category, date, paymentMethod?, description? }` |
| GET | `/expenses/:id` | |
| PUT | `/expenses/:id` | Partial update |
| DELETE | `/expenses/:id` | Soft delete (restorable for 30 days) |
| POST | `/expenses/:id/restore` | Undo a delete |

## Recurring

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/recurring` | All rules |
| POST | `/recurring` | `{ type: expense|income, title, amount, category, frequency: weekly|monthly|yearly, startDate, endDate?, paymentMethod? }`. Posts anything already due |
| PUT | `/recurring/:id` | `title, amount, category, paymentMethod, frequency, endDate, active` |
| DELETE | `/recurring/:id` | Past transactions are kept |
| POST | `/recurring/run` | Post what is due now (also runs hourly on the server) |
| GET | `/recurring/detected` | Steady repeating charges not yet tracked |

## Import

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/import/quick` | `{ text: "coffee 120 yesterday upi" }` → draft `{ kind, title, amount, date, category }`. Saves nothing. `422` if it cannot find an amount |
| POST | `/import/preview` | `{ csv }` → `{ rows[{line,date,title,amount,type,category,duplicate}], skipped, mapping, dateOrder }`. Saves nothing |
| POST | `/import/commit` | `{ rows[] }` (max 2000). Re-validated server-side → `{ expenses, income, rejected[] }` |

## Analytics

Range endpoints take `from` and `to` (`YYYY-MM-DD`). Month endpoints take `month=YYYY-MM` (default: current).

| Path | Returns |
| --- | --- |
| `/analytics/summary` | total, count, daily average, top category, vs previous period, `income`, `net`, `savingsRate` |
| `/analytics/categories` | totals per category |
| `/analytics/trends` | `groupBy=day|week|month` series |
| `/analytics/comparison` | category totals vs the previous period |
| `/analytics/cashflow` | income, expenses, net, savings rate, daily series, last 6 months |
| `/analytics/heatmap` | daily expense totals |
| `/analytics/forecast` | `{ sufficient, projected, spent, dailyRate, remainingDays, upcomingRecurring, confidence, projectedVsBudget, safeDailySpend, ... }` |
| `/analytics/health` | `{ sufficient, score, grade, components[{key,label,score,weight,detail}], tips[] }` |

## Budgets, categories, savings, reports, insights

| Method | Path | Notes |
| --- | --- | --- |
| GET/POST | `/budgets` | Query/body `month`, `year`. Returns spent, remaining, utilization, status (`ok|warning|critical`) |
| PUT/DELETE | `/budgets/:id` | |
| GET/POST | `/categories` | Defaults are protected |
| PUT/DELETE | `/categories/:id` | Rename cascades to expenses, budgets, recurring rules. Delete moves them to *Other* |
| GET/POST | `/savings` | `{ name, targetAmount, currentAmount?, targetDate? }` |
| PUT/DELETE | `/savings/:id` | |
| GET/POST | `/debts` | `{ name, kind: 'owe'|'lent', principal, dueDate?, note? }`. GET also returns `summary` (owe / lent totals, overdue count) |
| PUT/DELETE | `/debts/:id` | |
| POST | `/debts/:id/payments` | `{ amount, date?, note? }`. Cannot exceed the remaining balance |
| DELETE | `/debts/:id/payments/:paymentId` | |
| GET | `/backup` | Full JSON backup of everything the user owns (download) |
| GET | `/backup/transactions.csv` | Expenses and income as CSV (download) |
| GET | `/reports/monthly` | `month=YYYY-MM` or `from`+`to` → totals, income, net, categories, expenses, incomes |
| GET | `/insights` | `?month=YYYY-MM`. Rule-based; `{ sufficient, insights[] }` |
| GET | `/meta` | Income sources and payment methods |
| GET | `/health` | Liveness check (no auth) |
