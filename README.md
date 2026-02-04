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
cp .env.example .env
```

3. Edit `.env`:
```
NEXT_PUBLIC_API_URL=http://localhost:8080
```

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

```bash
npm run build
npm start
```

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
