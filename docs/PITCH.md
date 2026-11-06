# SpendWise: 3-minute pitch

**One line:** a personal finance app that tells you where your month is heading, and shows its working.

## Demo script (click "Try the live demo")

1. **Dashboard (30s).** "This is a demo account with sample data. Income, net cash flow and savings rate sit above the spend cards."
   Point at the **forecast**: "It projects month-end from the daily run-rate, leaves out rent, adds bills still due, and shows confidence."
   Point at the **health score**: "Budgets 35%, savings 35%, stability 15%, consistency 15%. Every component is shown. With too little data it says so instead of inventing a number."
2. **Quick add (20s).** Type `coffee 120 yesterday upi`. "Plain parsing rules, no AI. It opens the normal form so I confirm."
3. **Undo (10s).** Delete a row, press Undo. "Soft delete, restorable for 30 days."
4. **Import (40s).** Expenses, Import CSV, choose a bank statement. "It detects the date format and debit/credit columns, suggests categories, flags duplicates, and nothing is saved until I review."
5. **Recurring (30s).** "Rent and salary post themselves. Netflix, Spotify and the gym were found from history. One click tracks them."
6. **Ctrl+K (10s).** Open the palette, jump to Analytics. Show the cash-flow chart and heatmap calendar.
7. **Savings goal (10s).** "It tells you what to set aside each month to hit the date."
8. **Light theme (10s).** Toggle. "Not white: a soft lavender palette."

## What to say when asked "what's hard here?"

- **No double posting.** Recurring rules are claimed with an atomic update, so concurrent servers or repeated clicks create each transaction once (tested).
- **Honest numbers.** Forecast and health refuse to guess on thin data and explain every figure.
- **Security.** httpOnly cookie plus a CSRF header, rate limits, NoSQL operator stripping, hashed single-use reset tokens, sessions revoked on password change, and an isolation test for every resource.
- **Time zones.** "Today" comes from the user's device (bounded to 3 days of server time), so a 11:50 pm entry in Mumbai is not tomorrow in UTC.

## Honest trade-offs

- Categories are referenced by name; renames cascade in code. At scale, reference IDs.
- Currency is for display; there is no conversion.
- The score and forecast are transparent heuristics, not financial advice.
- Bank CSVs vary; there is always a review step.

## If there is a follow-up

Shared budgets for couples, bank-feed integration, multi-currency with stored FX rates, push reminders for bills.
