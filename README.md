# NichePulse — Zero-Verification Job Board

A rebuilt job-board concept focused on zero-verification publishing and crypto-friendly monetization.

## What it includes

- Immediate job publishing with no payment or verification gate.
- Optional crypto package display: USDT ERC-20, USDT TRC-20, ETH, SOL, BTC, XMR.
- Job search by keywords and location.
- Remote, Easy Apply, date posted, job type, experience, category, salary and sorting filters.
- Save jobs and recently viewed state.
- Job alerts stored locally in the browser.
- Candidate profile / resume / portfolio fields.
- Internal Easy Apply and external apply links.
- Application tracker and ATS-style employer pipeline.
- Employer job management, status changes and deletion.
- Company directory, company pages and community reviews.
- Salary explorer built from the current board's listing data.
- Candidate discovery demo view.
- Reporting flow for spam/scam/misleading listings.
- Responsive mobile UI.
- Local-first fallback if opened as a static file; persistent JSON storage when run with Node.

## Run locally

Requirements: Node 20+

```bash
npm start
```

Open http://localhost:3000

## Publish immediately

There is no payment-verification step. The **Publish job now** button writes the listing to `data/db.json` and returns the newly created live job.

## Crypto setup

The current build intentionally does not require payment to publish. When you are ready to display real receiving addresses, replace the example copy in the employer checkout section with your real wallet addresses. Do not put private keys or seed phrases in this project.

## Deployment

The included server is a small Node HTTP server with no third-party dependencies. It can run on hosts that support a persistent Node process and writable filesystem. For a multi-instance production deployment, replace the JSON store with a managed database.

## Important production note

Zero verification means no identity or payment verification is required by the product. It does not mean the service is automatically compliant with every law or platform policy. Add the moderation, terms, privacy, age-related restrictions, and reporting controls appropriate to your jurisdiction and target market.
