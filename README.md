# GTD Admin Panel

Simple admin panel untuk mengelola GTD API Gateway.

## Features

- 🔐 Login dengan Email & Password (JWT)
- 📊 Dashboard dengan system health & balance
- 👥 Client Management (CRUD, regenerate keys)
- 📦 Product Management (view products)
- 📈 Transaction History (view transactions)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment file:
```bash
cp .env.local.example .env.local
```

3. (Optional) Edit `.env.local` — default `NEXT_PUBLIC_API_URL=/api` uses Next.js proxy to backend; ensure API runs at `http://localhost:8080`.

4. Run development server:
```bash
npm run dev
```

5. Open browser: `http://localhost:3000`

## Login

Default credentials:
- Email: `admin@gtd.co.id`
- Password: `admin123`

## Build for Production

Set server env so `/api` rewrites to the real API (no CORS needed):

```bash
export API_BACKEND_URL=https://api.gtd.co.id
npm run build
npm start
```

Or on Vercel/hosting: add `API_BACKEND_URL=https://api.gtd.co.id` in project environment variables.

## Tech Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- Axios
- Lucide Icons
- date-fns

## Pages

- `/` - Login page
- `/dashboard` - System overview
- `/clients` - Manage API clients
- `/products` - View products
- `/transactions` - Transaction history

## Notes

- JWT token disimpan di localStorage
- Token valid 24 jam
- Semua request ke API menggunakan Bearer token authentication
- Logout akan menghapus token dari localStorage
