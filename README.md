# Parking Lot

Parking Lot is a React notes app designed for a simple Vercel deployment.

## Stack

- `frontend/`: React + TypeScript + Vite
- Vercel: static hosting for the frontend
- Browser `localStorage`: note persistence for the current device/browser

## Features

- Create, edit, pin, and delete notes
- Filter notes by tag and search across titles, content, and tags
- Persist notes locally without needing a separate backend service

## Frontend

The app lives in `frontend/` and can be developed or deployed independently.

## Local Setup

### 1. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

If PowerShell blocks `npm`, use:

```bash
cd frontend
cmd.exe /c npm.cmd install
cmd.exe /c npm.cmd run dev
```

## Vercel Deployment

Deploy the `frontend` app on Vercel.

1. Import this GitHub repo into Vercel.
2. Set the project root directory to `frontend`.
3. Keep the default Vite build settings, or use:

```bash
Build command: npm run build
Output directory: dist
```

## Notes

- The current recommended stack for this project is React + Vercel.
- The `backend/` folder can stay in the repo while the frontend ships independently.
