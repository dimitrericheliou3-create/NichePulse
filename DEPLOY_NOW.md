# Publish NichePulse immediately

## Local

1. Install Node 20+.
2. Run `npm start`.
3. Open `http://localhost:3000`.

## Render

This repository includes `render.yaml`.

1. Create a new Render Web Service from this project.
2. Use the Node runtime.
3. Build command: `npm install`.
4. Start command: `npm start`.
5. Health check: `/api/stats`.

The included JSON data store works on a single persistent service. For horizontal scaling, replace `data/db.json` with a managed database.

## Publishing behavior

The employer wizard ends with **Publish job now**. There is no payment verification, wallet signature, transaction hash, or identity verification gate. The listing is created immediately.
