# Implementation Plan: Admin UI Redesign

## Overview

Redesign frontend-only admin panel Gerbang Admin dari skema warna indigo/slate ke Blue-White Design System sesuai identitas brand GTD. Implementasi dilakukan secara berlapis: mulai dari token warna dan utility classes, lalu komponen bersama (Layout + Login), kemudian halaman-halaman individual, dan diakhiri dengan utilitas `getStatusStyle()` beserta property tests-nya.

Tidak ada perubahan pada logika bisnis, API call, state management, atau routing.

---

## Tasks

- [ ] 1. Konfigurasi Design Tokens dan Utility Classes
  - [ ] 1.1 Update `tailwind.config.js` — tambah brand color tokens
    - Tambahkan objek `brand` di `theme.extend.colors` yang memetakan `brand-50` s.d. `brand-900` ke hex palet `blue` Tailwind
    - Pastikan `content` paths sudah mencakup `pages/**`, `components/**`, dan `app/**`
    - _Requirements: 1.2_

  - [ ] 1.2 Update `styles/globals.css` — definisi ulang utility classes
    - Ganti `.btn-primary`: ubah `indigo-600` → `blue-600`, `indigo-700` → `blue-700`; tambahkan `disabled:opacity-50 disabled:cursor-not-allowed`
    - Ganti `.btn-secondary`: tambahkan `disabled:opacity-50 disabled:cursor-not-allowed`
    - Ganti `.input-field`: ubah `ring-indigo-500/20` → `ring-blue-500/20`, `border-indigo-500` → `border-blue-500`
    - Tambahkan `.badge` class: `inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium`
    - Pastikan `.card` dan `.stat-card` sudah sesuai spec (tidak perlu diubah, hanya diverifikasi)
    - _Requirements: 1.1, 1.4, 9.1, 9.2, 9.3, 9.4_

- [ ] 2. Redesign Sidebar (`components/Layout.tsx`)
  - [ ] 2.1 Implementasi sidebar light theme dan logo GTD
    - Ganti `aside` background dari dark gradient ke `bg-white border-r border-gray-200`
    - Ganti `<Shield>` icon dengan `<Image src="/logo_gtd.png" width={32} height={32}>` (import `Image` dari `next/image`)
    - Tambahkan state `logoError` dan tampilkan fallback teks `"GTD"` saat `onError`
    - Update teks brand: `text-gray-900` untuk "Gerbang", `text-gray-500` untuk "Admin"
    - Update border brand area: `border-b border-gray-100`
    - _Requirements: 2.1, 2.2, 2.4, 3.1, 3.2_

  - [ ] 2.2 Update nav items active/inactive/hover state
    - Nav aktif: `bg-blue-50 text-blue-700`, icon `text-blue-600`
    - Nav tidak aktif hover: `hover:bg-gray-50 hover:text-gray-700`, teks default `text-gray-500`
    - Label grup navigasi: `text-[10px] font-semibold uppercase tracking-widest text-gray-400`
    - Tombol Logout: `text-gray-500 hover:text-red-600 hover:bg-red-50`
    - Pertahankan `w-60`, `fixed`, `inset-y-0`, dan padding `p-8` pada `<main>`
    - _Requirements: 3.3, 3.4, 3.5, 3.6, 3.7, 5.4_

- [ ] 3. Redesign Halaman Login (`pages/index.tsx`)
  - [ ] 3.1 Update background gradient, dekorasi, dan logo
    - Ganti background: `from-blue-950 via-blue-900 to-slate-900`
    - Ganti dekorasi blur: tiga lingkaran dengan warna `blue-500/10`, `blue-600/10`, `blue-400/5`
    - Ganti `<Shield>` dengan `<Image src="/logo_gtd.png" width={48} height={48}>` + fallback `"GTD"`
    - Update subtitle: `text-blue-200`
    - _Requirements: 4.1, 4.3, 4.4, 2.3, 2.4_

  - [ ] 3.2 Update form card, tombol, dan error state
    - Card form: sudah `bg-white/[0.08] backdrop-blur-xl border border-white/10 rounded-2xl` — verifikasi dan sesuaikan jika ada `indigo`
    - Tombol Sign In: `bg-blue-600 hover:bg-blue-500 shadow-blue-600/25`
    - Input fields: ubah focus ring dari `indigo` ke `blue`
    - Error state: `bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl`
    - _Requirements: 4.2, 4.5, 4.6_

- [ ] 4. Update Halaman Dashboard (`pages/dashboard.tsx`)
  - [ ] 4.1 Ganti semua warna `indigo` → `blue` dan `slate` → `gray`
    - Cari semua class `indigo-{n}` dan ganti ke `blue-{n}` yang setara
    - Cari semua class `slate-{n}` pada elemen yang menghadap pengguna dan ganti ke `gray-{n}`
    - Pastikan Stat_Card menggunakan container icon `rounded-xl` dengan warna konteks (`blue-50`, `emerald-50`, `red-50`, `amber-50`)
    - Loading spinner: `border-blue-600`
    - _Requirements: 1.1, 6.1, 6.2, 6.3, 6.4, 11.2, 11.3_

- [ ] 5. Update Halaman Clients (`pages/clients.tsx`)
  - [ ] 5.1 Ganti warna `indigo` → `blue` dan `slate` → `gray`
    - Terapkan `indigo` → `blue` di semua elemen: tombol, badge, focus ring, aksen
    - Ganti `slate-{n}` → `gray-{n}` untuk teks dan border yang menghadap pengguna
    - Verifikasi Data_Table menggunakan header `bg-gray-50`, baris `hover:bg-gray-50`, action buttons dengan pattern hover `hover:text-{color}-600 hover:bg-{color}-50`
    - _Requirements: 7.1, 7.2, 7.4, 11.2, 11.3_

- [ ] 6. Update Halaman Products (`pages/products.tsx`)
  - [ ] 6.1 Ganti warna `indigo` → `blue` dan `slate` → `gray`
    - Terapkan penggantian warna yang sama seperti task 5.1
    - Verifikasi komponen modal (jika ada) menggunakan overlay `bg-black/50 backdrop-blur-sm` dan container `bg-white rounded-2xl`
    - _Requirements: 10.1, 10.2, 10.3, 11.2, 11.3_

- [ ] 7. Update Halaman Product Master (`pages/product-master.tsx`)
  - [ ] 7.1 Ganti warna `indigo` → `blue` dan `slate` → `gray`
    - Terapkan penggantian warna yang sama seperti task 5.1
    - _Requirements: 11.2, 11.3_

- [ ] 8. Update Halaman Providers (`pages/providers.tsx`)
  - [ ] 8.1 Ganti warna `indigo` → `blue` dan `slate` → `gray`
    - Terapkan penggantian warna yang sama seperti task 5.1
    - _Requirements: 11.2, 11.3_

- [ ] 9. Update Halaman Transactions (`pages/transactions.tsx`)
  - [ ] 9.1 Ganti warna `indigo` → `blue` dan `slate` → `gray`
    - Ganti semua `indigo-{n}` → `blue-{n}`
    - Ganti semua `slate-{n}` → `gray-{n}` (halaman ini kemungkinan banyak menggunakan `slate`)
    - Verifikasi Stat_Card, Data_Table, dan badge mengikuti Design_System
    - _Requirements: 6.1, 6.2, 7.1, 7.2, 11.2, 11.3_

- [ ] 10. Update Halaman Payments (`pages/payments.tsx`)
  - [ ] 10.1 Ganti warna `indigo` → `blue`
    - Terapkan penggantian warna `indigo` → `blue` di semua elemen
    - _Requirements: 11.2_

- [ ] 11. Update Halaman Payment Methods (`pages/payment-methods.tsx`)
  - [ ] 11.1 Ganti warna `indigo` → `blue`
    - Terapkan penggantian warna `indigo` → `blue` di semua elemen
    - _Requirements: 11.2_

- [ ] 12. Update Halaman Transfers (`pages/transfers.tsx`)
  - [ ] 12.1 Ganti warna `indigo` → `blue` dan `slate` → `gray`
    - Terapkan penggantian `indigo` → `blue` dan `slate` → `gray`
    - _Requirements: 11.2, 11.3_

- [ ] 13. Update Halaman Disbursement Methods (`pages/disbursement-methods.tsx`)
  - [ ] 13.1 Ganti warna `indigo` → `blue`
    - Terapkan penggantian warna `indigo` → `blue` di semua elemen
    - _Requirements: 11.2_

- [ ] 14. Checkpoint — Verifikasi konsistensi warna
  - Pastikan tidak ada sisa penggunaan `indigo-` di direktori `pages/` dan `components/`
  - Pastikan tidak ada sisa `slate-` pada elemen yang menghadap pengguna
  - Pastikan semua loading spinner menggunakan `border-blue-600`
  - Pastikan semua tombol primary menggunakan `.btn-primary` atau `bg-blue-600` secara konsisten
  - Tanyakan kepada user jika ada pertanyaan sebelum melanjutkan.

- [ ] 15. Implementasi `lib/status.ts` dan property tests
  - [ ] 15.1 Buat file `lib/status.ts` dengan fungsi `getStatusStyle()`
    - Buat file baru `lib/status.ts`
    - Implementasikan fungsi `getStatusStyle(status: string): string` dengan map lengkap:
      - `active`, `success`, `connected`, `paid` → `'bg-emerald-50 text-emerald-700'`
      - `inactive`, `failed` → `'bg-red-50 text-red-700'`
      - `pending` → `'bg-amber-50 text-amber-700'`
      - `processing` → `'bg-blue-50 text-blue-700'`
      - `expired`, `cancelled`, `disabled` → `'bg-gray-100 text-gray-600'`
      - `refunded` → `'bg-purple-50 text-purple-700'`
      - fallback (status tidak dikenal) → `'bg-gray-100 text-gray-600'`
    - Gunakan `status.toLowerCase()` sebelum lookup agar case-insensitive
    - Export fungsi sebagai named export
    - _Requirements: 8.1, 8.2, 8.4_

  - [ ]* 15.2 Tulis property test untuk `getStatusStyle()` — Property 1
    - **Property 1: Status dikenal menghasilkan style non-default yang bermakna**
    - Install `fast-check` jika belum ada: `npm install --save-dev fast-check`
    - Setup test framework (Jest atau Vitest sesuai yang ada di project)
    - Buat file test `lib/__tests__/status.test.ts`
    - Gunakan `fc.constantFrom(...knownStatuses)` untuk generate status dikenal secara acak
    - Asersi: `getStatusStyle(status)` harus mengandung nama warna yang sesuai konteks (`emerald`, `red`, `amber`, `blue`, `purple`, atau `gray`)
    - Jalankan minimum 100 iterasi
    - **Validates: Requirements 8.1, 8.4**

  - [ ]* 15.3 Tulis property test untuk `getStatusStyle()` — Property 2
    - **Property 2: Status tidak dikenal menghasilkan fallback gray, tidak pernah throw**
    - Pada file test yang sama `lib/__tests__/status.test.ts`
    - Gunakan `fc.string().filter(s => !KNOWN_STATUSES.has(s.toLowerCase()))` untuk generate string acak bukan status dikenal
    - Asersi: fungsi tidak boleh throw exception DAN harus mengembalikan tepat `'bg-gray-100 text-gray-600'`
    - Jalankan minimum 100 iterasi
    - **Validates: Requirements 8.1, 8.4**

- [ ] 16. Integrasi `getStatusStyle()` ke halaman-halaman yang menampilkan status
  - [ ] 16.1 Ganti inline status color logic di semua halaman dengan `getStatusStyle()`
    - Import `getStatusStyle` dari `@/lib/status` di halaman: `clients.tsx`, `providers.tsx`, `transactions.tsx`, `payments.tsx`, `payment-methods.tsx`, `transfers.tsx`, `disbursement-methods.tsx`
    - Hapus atau refactor logika pewarnaan status yang ada (biasanya conditional/ternary untuk className badge)
    - Terapkan pattern: `<span className={`badge ${getStatusStyle(item.status)}`}>{item.status}</span>`
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 17. Final Checkpoint — Pastikan semua tests pass
  - Pastikan semua tests pass, tanyakan kepada user jika ada pertanyaan.

---

## Notes

- Task bertanda `*` bersifat opsional dan dapat dilewati untuk implementasi MVP yang lebih cepat.
- Setiap task mereferensikan requirement spesifik untuk traceability.
- Checkpoint memastikan validasi inkremental sebelum melanjutkan ke tahap berikutnya.
- Property tests (`15.2`, `15.3`) memvalidasi perilaku universal `getStatusStyle()` menggunakan library `fast-check`.
- Urutan task dirancang agar perubahan tidak "menggantung" — setiap task terintegrasi ke task sebelumnya.
- Design bersifat frontend-only: tidak ada perubahan API, state management, atau routing.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["2.1", "3.1", "15.1"] },
    { "id": 3, "tasks": ["2.2", "3.2", "4.1", "5.1", "6.1", "7.1", "8.1", "9.1", "10.1", "11.1", "12.1", "13.1"] },
    { "id": 4, "tasks": ["15.2", "15.3"] },
    { "id": 5, "tasks": ["16.1"] }
  ]
}
```
