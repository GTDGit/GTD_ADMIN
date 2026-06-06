# Design Document: Admin UI Redesign

## Overview

Redesign ini bersifat **frontend-only** — tidak ada perubahan pada logika bisnis, API call, state management, atau struktur routing. Target utamanya adalah:

1. Mengganti skema warna indigo/slate dengan **biru-putih (Blue-White Design System)** yang sesuai identitas brand GTD.
2. Mengganti Shield icon dengan **logo_gtd.png** di sidebar dan halaman login.
3. Membangun **komponen UI yang konsisten** (badge, tabel, modal, card, tombol) di seluruh 11 halaman.

### Prinsip Desain

- **Bersih & Profesional**: Sidebar terang (putih) + konten putih di atas background abu muda (`gray-50`).
- **Hirarkis**: Primary blue untuk aksi utama, semantic color untuk status (emerald sukses, red gagal, amber pending).
- **Konsisten**: Design tokens terpusat di `tailwind.config.js` dan utility class di `globals.css`.
- **Tidak Merusak**: Seluruh API call, state, routing, dan logika bisnis tetap utuh.

---

## Architecture

Karena ini adalah proyek Next.js 14 dengan Pages Router, arsitektur frontend yang ada sudah solid. Redesign mengikuti struktur yang sudah ada:

```
admin/
├── components/
│   └── Layout.tsx          ← Sidebar + main layout wrapper (diubah)
├── pages/
│   ├── index.tsx           ← Login (diubah)
│   ├── dashboard.tsx       ← (diubah warna)
│   └── ...10 halaman lain  ← (diubah warna + komponen)
├── styles/
│   └── globals.css         ← Design tokens & utility classes (diubah)
├── tailwind.config.js      ← Brand color tokens (diubah)
└── public/
    └── logo_gtd.png        ← Logo baru (sudah ada, tidak diubah)
```

### Lapisan Perubahan

```
┌─────────────────────────────────────┐
│  Pages (11 halaman)                 │  ← Ganti indigo→blue, slate→gray
│  index.tsx, dashboard.tsx, ...      │     Gunakan utility classes baru
├─────────────────────────────────────┤
│  Layout.tsx (Sidebar)               │  ← Ganti Shield→logo_gtd, dark→light
├─────────────────────────────────────┤
│  globals.css (Utility Classes)      │  ← Definisi ulang .btn-primary, dll.
├─────────────────────────────────────┤
│  tailwind.config.js (Tokens)        │  ← Tambah brand color tokens
└─────────────────────────────────────┘
```

---

## Components and Interfaces

### 1. `tailwind.config.js` — Design Tokens

Tambahkan `brand` color token yang dipetakan ke palet `blue` Tailwind:

```js
// tailwind.config.js
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eff6ff',   // blue-50
          100: '#dbeafe',   // blue-100
          200: '#bfdbfe',   // blue-200
          300: '#93c5fd',   // blue-300
          400: '#60a5fa',   // blue-400
          500: '#3b82f6',   // blue-500
          600: '#2563eb',   // blue-600  ← warna primer utama
          700: '#1d4ed8',   // blue-700
          800: '#1e40af',   // blue-800
          900: '#1e3a8a',   // blue-900
        },
      },
    },
  },
  plugins: [],
}
```

### 2. `globals.css` — Utility Classes

Definisi ulang semua utility class dengan Blue Design System:

```css
@layer components {
  /* Tombol */
  .btn-primary {
    @apply bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700
           transition-all duration-200 font-medium text-sm shadow-sm
           hover:shadow disabled:opacity-50 disabled:cursor-not-allowed;
  }

  .btn-secondary {
    @apply bg-white text-gray-700 px-4 py-2 rounded-lg border border-gray-200
           hover:bg-gray-50 transition-all duration-200 font-medium text-sm
           disabled:opacity-50 disabled:cursor-not-allowed;
  }

  /* Input */
  .input-field {
    @apply w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm
           focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
           transition-all duration-200 outline-none bg-white;
  }

  /* Card */
  .card {
    @apply bg-white rounded-xl border border-gray-200 shadow-sm;
  }

  .stat-card {
    @apply card p-5 hover:shadow-md transition-all duration-200;
  }

  /* Badge */
  .badge {
    @apply inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium;
  }
}
```

### 3. `components/Layout.tsx` — Sidebar Baru

Perubahan utama sidebar:

| Aspek | Lama | Baru |
|---|---|---|
| Background | `bg-gradient-to-b from-slate-900 ...` | `bg-white border-r border-gray-200` |
| Logo | `<Shield>` icon + indigo bg | `<Image src="/logo_gtd.png">` + blue bg |
| Teks brand | `text-white` | `text-gray-900` |
| Nav aktif | `bg-indigo-600/20 text-indigo-200` | `bg-blue-50 text-blue-700` |
| Nav hover | `hover:bg-white/[0.05]` | `hover:bg-gray-50 hover:text-gray-700` |
| Logout | `text-slate-400 hover:text-red-400` | `text-gray-500 hover:text-red-600 hover:bg-red-50` |

Antarmuka komponen tidak berubah:

```tsx
// Tidak ada perubahan props — hanya visual
interface LayoutProps {
  children: ReactNode;
}
```

### 4. `pages/index.tsx` — Login Baru

Perubahan halaman login:

| Aspek | Lama | Baru |
|---|---|---|
| Background | `from-slate-900 via-indigo-950 to-slate-900` | `from-blue-950 via-blue-900 to-slate-900` |
| Dekorasi | `bg-indigo-500/10`, `bg-purple-500/10` | `bg-blue-500/10`, `bg-blue-600/10`, `bg-blue-400/5` |
| Logo | `<Shield>` icon | `<Image src="/logo_gtd.png">` + fallback "GTD" |
| Subtitle | `text-slate-400` | `text-blue-200` |
| Tombol | `bg-indigo-600` | `bg-blue-600` |

### 5. Fungsi Utilitas `getStatusStyle()`

Fungsi ini diekstrak ke file utilitas tersendiri atau didefinisikan di atas komponen halaman, dan digunakan ulang di semua halaman yang menampilkan status:

```ts
// lib/status.ts  (atau didefinisikan sebagai helper di tiap page)
export function getStatusStyle(status: string): string {
  const map: Record<string, string> = {
    // Active/Connected/Success
    active:     'bg-emerald-50 text-emerald-700',
    success:    'bg-emerald-50 text-emerald-700',
    connected:  'bg-emerald-50 text-emerald-700',
    paid:       'bg-emerald-50 text-emerald-700',
    // Failed/Inactive
    inactive:   'bg-red-50 text-red-700',
    failed:     'bg-red-50 text-red-700',
    // Pending
    pending:    'bg-amber-50 text-amber-700',
    // Processing
    processing: 'bg-blue-50 text-blue-700',
    // Expired/Cancelled/Unknown
    expired:    'bg-gray-100 text-gray-600',
    cancelled:  'bg-gray-100 text-gray-600',
    disabled:   'bg-gray-100 text-gray-600',
    refunded:   'bg-purple-50 text-purple-700',
  };
  return map[status.toLowerCase()] ?? 'bg-gray-100 text-gray-600';
}
```

---

## Data Models

Redesign ini tidak mengubah data model apapun. Semua tipe TypeScript yang ada (`Transaction`, `Payment`, `Client`, dsb.) tetap sama persis.

Satu-satunya "model" baru adalah skema warna yang direpresentasikan sebagai token Tailwind di `tailwind.config.js` (lihat Components di atas).

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Sebagian besar acceptance criteria dalam spec ini adalah CSS/styling requirements yang tidak memiliki logika bisnis yang bisa diuji secara otomatis dengan property-based testing. Namun, ada satu komponen dengan logika komputasi murni yang layak diuji: fungsi `getStatusStyle()`.

**Property Reflection**: Dari prework analysis, hanya satu area yang mengandung logika murni yang testable: fungsi mapping status→style. Requirement 8.1, 8.2, 8.3, dan 8.4 semuanya berkaitan dengan perilaku fungsi `getStatusStyle()`. Setelah refleksi, ini bisa dikonsolidasi menjadi dua properti yang saling melengkapi: (1) status valid selalu menghasilkan style yang tepat, dan (2) status tidak dikenal selalu menghasilkan fallback daripada crash atau string kosong.

### Property 1: Status dikenal menghasilkan style non-default yang bermakna

*For any* status string yang termasuk dalam set status yang dikenali sistem (`active`, `inactive`, `success`, `failed`, `pending`, `processing`, `connected`, `paid`, `expired`, `cancelled`, `disabled`, `refunded`), fungsi `getStatusStyle()` harus mengembalikan string CSS class yang mengandung warna yang sesuai konteks (emerald untuk sukses, red untuk gagal, amber untuk pending, blue untuk processing, purple untuk refunded).

**Validates: Requirements 8.1, 8.4**

### Property 2: Status tidak dikenal menghasilkan fallback gray

*For any* string yang bukan merupakan status yang dikenali sistem (termasuk string kosong, karakter acak, atau status typo), fungsi `getStatusStyle()` harus mengembalikan string fallback `'bg-gray-100 text-gray-600'` — tidak pernah mengembalikan string kosong dan tidak pernah melempar exception.

**Validates: Requirements 8.1, 8.4**

---

## Error Handling

Karena ini adalah redesign frontend-only, error handling yang ada tidak berubah. Beberapa pola error handling yang dipertahankan dan diperbaiki tampilannya:

### Error States yang Diperbarui Tampilannya

| State | Komponen | Style Baru |
|---|---|---|
| Auth error (login) | Halaman Login | `bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl` |
| Empty state (tabel) | Data Table | Icon `text-gray-300` + teks `text-gray-500` |
| Logo load error | Sidebar & Login | Fallback teks "GTD" di dalam container logo |
| Loading state | Semua halaman | Spinner `border-blue-600` (bukan `border-indigo-600`) |

### Logo Fallback

Komponen `<Image>` Next.js mendukung `onError` callback. Untuk fallback:

```tsx
// Di Sidebar dan Login
const [logoError, setLogoError] = useState(false);

{logoError ? (
  <span className="text-white font-bold text-sm">GTD</span>
) : (
  <Image
    src="/logo_gtd.png"
    alt="GTD Logo"
    width={32}
    height={32}
    onError={() => setLogoError(true)}
  />
)}
```

---

## Testing Strategy

### Penilaian PBT

Fitur ini adalah **UI redesign** — sebagian besar perubahan adalah CSS/styling yang tidak memiliki logika input/output yang bermakna untuk property-based testing. Namun, fungsi `getStatusStyle()` adalah pure function dengan logika mapping yang bisa diuji.

**PBT digunakan hanya untuk**: fungsi `getStatusStyle()`.
**PBT tidak digunakan untuk**: perubahan CSS class, rendering komponen, konfigurasi Tailwind.

### Unit Tests (Example-Based)

Fokus pada verifikasi rendering dan behavior konkret:

1. **Logo rendering** — Sidebar merender `<Image>` dengan `src="/logo_gtd.png"` (bukan Shield icon).
2. **Logo fallback** — Ketika `onError` dipicu, komponen menampilkan teks "GTD".
3. **Login logo** — Halaman login merender logo dengan width=48 height=48.
4. **Sidebar active state** — Item nav aktif memiliki class `bg-blue-50` dan `text-blue-700`.
5. **`getStatusStyle('success')`** — Mengembalikan class yang mengandung `emerald`.
6. **`getStatusStyle('failed')`** — Mengembalikan class yang mengandung `red`.
7. **`getStatusStyle('')`** — Mengembalikan fallback `bg-gray-100 text-gray-600`.

### Property-Based Tests

Library: **fast-check** (TypeScript/JavaScript, cocok dengan stack Next.js).

Konfigurasi minimum 100 iterasi per property test.

**Property 1: Status dikenal → style bermakna**

```ts
// Tag: Feature: admin-ui-redesign, Property 1: known status returns meaningful style
import * as fc from 'fast-check';
import { getStatusStyle } from '@/lib/status';

const KNOWN_STATUS_COLOR_MAP: Record<string, string> = {
  active: 'emerald', success: 'emerald', connected: 'emerald', paid: 'emerald',
  inactive: 'red', failed: 'red',
  pending: 'amber',
  processing: 'blue',
  refunded: 'purple',
  expired: 'gray', cancelled: 'gray', disabled: 'gray',
};

test('Property 1: known status always returns style containing expected color', () => {
  const knownStatuses = Object.keys(KNOWN_STATUS_COLOR_MAP);
  fc.assert(
    fc.property(fc.constantFrom(...knownStatuses), (status) => {
      const style = getStatusStyle(status);
      const expectedColor = KNOWN_STATUS_COLOR_MAP[status];
      return style.includes(expectedColor);
    }),
    { numRuns: 100 }
  );
});
```

**Property 2: Status tidak dikenal → fallback gray, tidak pernah throw**

```ts
// Tag: Feature: admin-ui-redesign, Property 2: unknown status always returns gray fallback
import * as fc from 'fast-check';
import { getStatusStyle } from '@/lib/status';

const KNOWN_STATUSES = new Set([
  'active', 'inactive', 'success', 'failed', 'pending',
  'processing', 'connected', 'paid', 'expired', 'cancelled',
  'disabled', 'refunded',
]);

test('Property 2: unknown status always returns gray fallback, never throws', () => {
  fc.assert(
    fc.property(
      fc.string().filter((s) => !KNOWN_STATUSES.has(s.toLowerCase())),
      (unknownStatus) => {
        let result: string;
        try {
          result = getStatusStyle(unknownStatus);
        } catch {
          return false; // tidak boleh throw
        }
        return result === 'bg-gray-100 text-gray-600';
      }
    ),
    { numRuns: 100 }
  );
});
```

### Integration / Visual Tests

Untuk verifikasi konsistensi visual lintas halaman, gunakan snapshot testing atau visual regression (misalnya Chromatic dengan Storybook, atau Playwright screenshot tests):

- Snapshot sidebar sebelum/sesudah untuk memastikan logo dan warna berubah.
- Screenshot tiap halaman untuk memastikan tidak ada overflow atau layout break.

### Checklist Manual

Beberapa requirement tidak bisa diautomasi secara efektif dan perlu verifikasi manual:

- [ ] Semua teks memiliki rasio kontras ≥ 4.5:1 (gunakan browser DevTools Accessibility atau axe).
- [ ] Navigasi keyboard (Tab) menghasilkan focus ring `blue-500` yang terlihat di semua elemen interaktif.
- [ ] Tabel dapat di-scroll horizontal di viewport 1024px.
- [ ] Tidak ada penggunaan `indigo-` yang tersisa di file halaman (cek dengan `grep -r "indigo-" pages/ components/`).
