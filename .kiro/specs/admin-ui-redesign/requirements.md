# Requirements Document

## Introduction

Fitur ini mencakup redesign menyeluruh tampilan admin panel **Gerbang Admin** — aplikasi PPOB Gateway Management berbasis Next.js 14. Tujuannya adalah mengganti skema warna indigo/slate yang ada saat ini menjadi skema biru-putih yang sesuai dengan identitas brand GTD, mengganti Shield icon dengan logo `logo_gtd.png`, serta meningkatkan kualitas visual seluruh komponen UI agar tampil modern, clean, konsisten, dan profesional di semua 11 halaman admin panel.

Redesign bersifat **frontend-only**: tidak ada perubahan pada logika bisnis, API call, state management, atau struktur routing yang sudah ada.

---

## Glossary

- **Admin_Panel**: Aplikasi Next.js 14 Gerbang Admin yang berjalan di direktori `admin/`
- **Design_System**: Kumpulan token warna, tipografi, spacing, dan komponen Tailwind CSS yang diterapkan secara konsisten di seluruh halaman
- **Brand_Blue**: Palet warna biru utama GTD — warna primer `blue-600` (#2563EB), dengan variasi `blue-50` hingga `blue-900`
- **Logo_GTD**: File gambar `public/logo_gtd.png` milik GTD yang menggantikan Shield icon di sidebar dan halaman login
- **Sidebar**: Komponen navigasi tetap di sisi kiri layar yang didefinisikan di `components/Layout.tsx`
- **Stat_Card**: Komponen kartu ringkasan statistik yang digunakan di halaman Dashboard, Transactions, Payments, dan Transfers
- **Data_Table**: Komponen tabel data dengan header, baris, pagination, dan action buttons
- **Modal**: Overlay dialog yang digunakan untuk form create/edit dan detail view
- **Status_Badge**: Elemen visual inline (pill/badge) yang menampilkan status seperti Active, Inactive, Success, Failed, Pending
- **Empty_State**: Tampilan placeholder saat data kosong di tabel atau daftar
- **Loading_Spinner**: Indikator animasi saat data sedang dimuat
- **Page_Header**: Bagian atas setiap halaman yang memuat judul, deskripsi, dan action buttons utama

---

## Requirements

### Requirement 1: Design System Berbasis Biru-Putih

**User Story:** Sebagai admin, saya ingin seluruh tampilan admin panel menggunakan skema warna biru dan putih yang konsisten, sehingga antarmuka terasa profesional dan sesuai dengan identitas brand GTD.

#### Acceptance Criteria

1. THE Admin_Panel SHALL menggunakan palet warna primer `blue-600` (#2563EB) sebagai pengganti `indigo-600` di seluruh elemen interaktif termasuk tombol primary, active state navigasi, focus ring, dan aksen warna.
2. THE Design_System SHALL mendefinisikan token warna berikut di `tailwind.config.js`: `brand-50` sampai `brand-900` yang dipetakan ke palet `blue` dari Tailwind CSS.
3. THE Admin_Panel SHALL menggunakan warna latar belakang `white` untuk konten utama dan `gray-50` untuk latar belakang halaman, menciptakan hierarki visual yang jelas.
4. THE Design_System SHALL mendefinisikan ulang class utility `.btn-primary`, `.btn-secondary`, `.card`, `.stat-card`, `.input-field`, dan `.badge` di `styles/globals.css` menggunakan palet Brand_Blue.
5. WHEN elemen interaktif (tombol, link, input) menerima focus dari keyboard, THE Design_System SHALL menampilkan focus ring berwarna `blue-500` dengan opacity 40% agar memenuhi standar aksesibilitas WCAG 2.1 AA.
6. THE Design_System SHALL menggunakan font Inter yang sudah ada, dengan skala tipografi yang konsisten: `text-2xl font-bold` untuk judul halaman, `text-base font-semibold` untuk judul seksi, dan `text-sm` untuk konten tabel dan label.

---

### Requirement 2: Penggantian Logo di Sidebar dan Halaman Login

**User Story:** Sebagai admin, saya ingin melihat logo GTD asli di sidebar dan halaman login — bukan Shield icon — sehingga admin panel mencerminkan identitas brand GTD secara tepat.

#### Acceptance Criteria

1. WHEN Sidebar dirender, THE Sidebar SHALL menampilkan komponen `<Image>` Next.js yang memuat `logo_gtd.png` dari direktori `public/` sebagai pengganti elemen Shield icon saat ini.
2. THE Sidebar SHALL menampilkan logo_gtd.png dengan dimensi `width=32 height=32` di dalam container berukuran `w-9 h-9` dengan background `blue-600` dan border radius `rounded-xl`.
3. WHEN halaman login dirender, THE Admin_Panel SHALL menampilkan logo_gtd.png dengan dimensi `width=48 height=48` di dalam container berukuran `w-16 h-16` di atas form login, menggantikan Shield icon yang ada.
4. IF file `logo_gtd.png` gagal dimuat oleh browser, THEN THE Admin_Panel SHALL menampilkan teks fallback "GTD" di dalam container logo agar brand identity tetap tersampaikan.
5. THE Admin_Panel SHALL mendeklarasikan `images.domains` atau menggunakan `unoptimized: false` di `next.config.js` sehingga komponen `<Image>` dapat merender file statis lokal dengan benar.

---

### Requirement 3: Redesign Sidebar Navigasi

**User Story:** Sebagai admin, saya ingin sidebar navigasi tampil modern dengan skema biru-putih yang bersih, sehingga navigasi terasa nyaman dan mencerminkan hierarki menu yang jelas.

#### Acceptance Criteria

1. THE Sidebar SHALL menggunakan background `white` dengan border kanan `border-r border-gray-200` sebagai pengganti gradient `from-slate-900 via-slate-900 to-indigo-950` yang gelap.
2. THE Sidebar SHALL menampilkan area brand di bagian atas dengan Logo_GTD, teks "Gerbang" berwarna `gray-900`, dan subtitle "Admin" berwarna `gray-500`, dipisahkan oleh `border-b border-gray-100`.
3. WHEN item navigasi dalam keadaan aktif (pathname cocok), THE Sidebar SHALL menampilkan item tersebut dengan background `blue-50`, teks `blue-700`, dan icon `blue-600`.
4. WHEN item navigasi dalam keadaan tidak aktif dan di-hover, THE Sidebar SHALL menampilkan item tersebut dengan background `gray-50` dan teks `gray-700`.
5. THE Sidebar SHALL menampilkan label grup navigasi ("PPOB", "Payment", "Disbursement") dengan style `text-[10px] font-semibold uppercase tracking-widest text-gray-400`.
6. THE Sidebar SHALL menampilkan tombol Logout di bagian bawah dengan style `text-gray-500 hover:text-red-600 hover:bg-red-50` agar memberi sinyal visual tindakan destruktif.
7. THE Sidebar SHALL mempertahankan lebar `w-60` dan posisi `fixed` agar layout halaman tidak berubah.

---

### Requirement 4: Redesign Halaman Login

**User Story:** Sebagai admin, saya ingin halaman login memiliki tampilan yang modern dan profesional dengan nuansa biru-putih, sehingga memberikan kesan pertama yang positif terhadap sistem.

#### Acceptance Criteria

1. THE Admin_Panel SHALL menampilkan halaman login dengan background gradient `from-blue-950 via-blue-900 to-slate-900` sebagai pengganti gradient `from-slate-900 via-indigo-950 to-slate-900`.
2. THE Admin_Panel SHALL menampilkan card form login dengan style `bg-white/[0.08] backdrop-blur-xl border border-white/10 rounded-2xl` agar tetap terbaca di atas background gelap.
3. THE Admin_Panel SHALL menampilkan Logo_GTD di atas form login sesuai Requirement 2, diikuti judul "Gerbang Admin" berwarna `white` dan subtitle "PPOB Gateway Management" berwarna `blue-200`.
4. THE Admin_Panel SHALL menampilkan dekorasi background berupa tiga lingkaran blur dengan warna `blue-500/10`, `blue-600/10`, dan `blue-400/5` untuk memberikan depth visual.
5. WHEN admin mengklik tombol "Sign In", THE Admin_Panel SHALL menampilkan tombol dengan background `blue-600`, hover state `blue-500`, dan shadow `shadow-blue-600/25` agar konsisten dengan Design_System.
6. IF terjadi error autentikasi, THEN THE Admin_Panel SHALL menampilkan pesan error di dalam container dengan style `bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl`.

---

### Requirement 5: Redesign Page Header dan Layout Konten

**User Story:** Sebagai admin, saya ingin setiap halaman memiliki header yang konsisten dan layout konten yang bersih, sehingga saya dapat dengan cepat memahami konteks halaman dan menemukan aksi utama.

#### Acceptance Criteria

1. THE Page_Header di setiap halaman SHALL menampilkan judul halaman dengan style `text-2xl font-bold text-gray-900` dan deskripsi dengan style `text-sm text-gray-500 mt-1`.
2. THE Page_Header SHALL memposisikan action buttons utama (seperti "Add Client", "Refresh") di sisi kanan header menggunakan `flex justify-between items-center`.
3. THE Admin_Panel SHALL menggunakan margin bawah `mb-6` atau `mb-8` yang konsisten antara Page_Header dan konten halaman di semua halaman.
4. THE Admin_Panel SHALL menggunakan padding halaman `p-8` pada elemen `<main>` di Layout.tsx agar konten tidak terlalu rapat dengan tepi layar.
5. WHILE halaman sedang memuat data dari API, THE Admin_Panel SHALL menampilkan Loading_Spinner berwarna `blue-600` dengan ukuran `h-10 w-10` di tengah area konten.

---

### Requirement 6: Redesign Komponen Card dan Stat Card

**User Story:** Sebagai admin, saya ingin card dan stat card menampilkan informasi dengan cara yang menarik secara visual dan mudah dibaca, sehingga saya dapat memindai data penting dengan cepat.

#### Acceptance Criteria

1. THE Admin_Panel SHALL menerapkan style `.card` sebagai `bg-white rounded-xl border border-gray-200 shadow-sm` secara konsisten di seluruh halaman.
2. THE Stat_Card SHALL menampilkan icon di dalam container berukuran `w-10 h-10 rounded-xl` dengan warna background yang sesuai konteks: `blue-50` untuk metrik primer, `emerald-50` untuk metrik sukses, `red-50` untuk metrik gagal, dan `amber-50` untuk metrik lainnya.
3. WHEN Stat_Card di-hover, THE Stat_Card SHALL menerapkan `hover:shadow-md transition-all duration-200` untuk memberikan feedback visual.
4. THE Stat_Card SHALL menampilkan nilai metrik dengan style `text-xl font-bold` dan label dengan style `text-sm text-gray-500`.
5. THE Admin_Panel SHALL menerapkan grid layout `grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5` untuk baris Stat_Card agar responsif di berbagai ukuran layar.

---

### Requirement 7: Redesign Komponen Tabel Data

**User Story:** Sebagai admin, saya ingin tabel data memiliki tampilan yang bersih dan mudah dibaca, sehingga saya dapat memonitor dan mengelola data transaksi, klien, produk, dan lainnya dengan efisien.

#### Acceptance Criteria

1. THE Data_Table SHALL menggunakan header tabel dengan style `bg-gray-50` dan teks `text-xs font-medium text-gray-500 uppercase tracking-wider`.
2. THE Data_Table SHALL menggunakan baris tabel dengan style `bg-white hover:bg-gray-50 transition-colors` dan pemisah `divide-y divide-gray-200`.
3. THE Data_Table SHALL membungkus tabel dalam container `.card overflow-hidden` agar border radius card tidak tertimpa oleh elemen tabel.
4. THE Data_Table SHALL menampilkan action buttons per baris dengan style `p-1.5 rounded-lg text-gray-400 hover:text-{color}-600 hover:bg-{color}-50 transition-colors`.
5. WHEN data tabel kosong, THE Data_Table SHALL menampilkan Empty_State dengan icon berwarna `gray-300`, teks deskripsi `text-gray-500`, dan opsional sebuah action button.
6. THE Data_Table SHALL menampilkan pagination dengan style `border-t border-gray-100 px-4 py-3` yang menampilkan info "Showing X to Y of Z" dan tombol navigasi halaman.

---

### Requirement 8: Redesign Komponen Status Badge

**User Story:** Sebagai admin, saya ingin status badge menampilkan warna yang intuitif dan konsisten, sehingga saya dapat langsung mengenali status transaksi, provider, dan pembayaran dengan sekilas pandang.

#### Acceptance Criteria

1. THE Status_Badge SHALL menggunakan palet warna berikut secara konsisten di seluruh halaman: `bg-emerald-50 text-emerald-700` untuk status "Active/Success/Connected", `bg-red-50 text-red-700` untuk status "Inactive/Failed", `bg-amber-50 text-amber-700` untuk status "Pending", `bg-blue-50 text-blue-700` untuk status "Processing", dan `bg-gray-100 text-gray-600` untuk status "Unknown/Disabled".
2. THE Status_Badge SHALL menggunakan style `inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium` sebagai base style yang konsisten.
3. WHERE Status_Badge ditampilkan di dalam tabel, THE Status_Badge SHALL mempertahankan ukuran `text-xs` agar tidak memengaruhi tinggi baris tabel.
4. THE Admin_Panel SHALL mengekstrak logika pewarnaan status ke dalam sebuah fungsi utilitas `getStatusStyle(status: string)` yang dapat digunakan ulang di semua halaman yang menampilkan status.

---

### Requirement 9: Redesign Komponen Tombol dan Form Input

**User Story:** Sebagai admin, saya ingin tombol dan input form memiliki tampilan yang konsisten dan feedback visual yang jelas, sehingga saya merasa nyaman saat berinteraksi dengan form manajemen data.

#### Acceptance Criteria

1. THE Admin_Panel SHALL mendefinisikan class `.btn-primary` dengan style `bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium text-sm shadow-sm hover:shadow` di `styles/globals.css`.
2. THE Admin_Panel SHALL mendefinisikan class `.btn-secondary` dengan style `bg-white text-gray-700 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-all duration-200 font-medium text-sm` di `styles/globals.css`.
3. THE Admin_Panel SHALL mendefinisikan class `.input-field` dengan style `w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 outline-none bg-white` di `styles/globals.css`.
4. WHEN tombol dalam keadaan `disabled`, THE Admin_Panel SHALL menerapkan style `disabled:opacity-50 disabled:cursor-not-allowed` pada semua varian tombol.
5. THE Admin_Panel SHALL menggunakan `<select>` dengan style yang sama dengan `.input-field` di semua halaman yang memiliki dropdown filter agar tampilan konsisten.

---

### Requirement 10: Redesign Komponen Modal

**User Story:** Sebagai admin, saya ingin modal form dan modal detail tampil profesional dengan overlay yang tepat dan animasi yang halus, sehingga saya dapat fokus pada tugas yang sedang dikerjakan.

#### Acceptance Criteria

1. THE Modal SHALL menggunakan overlay dengan style `fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4` di semua halaman.
2. THE Modal SHALL menggunakan container dengan style `bg-white rounded-2xl shadow-xl w-full max-w-{size}` dengan ukuran yang sesuai konten (md untuk form sederhana, lg untuk form kompleks atau detail view).
3. THE Modal SHALL menampilkan header dengan `border-b border-gray-100 p-5` yang memuat judul modal `text-lg font-semibold text-gray-900` dan tombol close `X` di sisi kanan.
4. THE Modal SHALL menampilkan area form dengan `p-5 space-y-4` dan area footer action buttons dengan `flex gap-3` yang memuat tombol submit primary dan tombol cancel secondary.
5. THE Modal SHALL menggunakan label input dengan style `block text-sm font-medium text-gray-700 mb-1.5` secara konsisten di seluruh form modal.

---

### Requirement 11: Konsistensi Visual Lintas Halaman

**User Story:** Sebagai admin, saya ingin semua halaman admin panel terasa seperti satu produk yang kohesif, sehingga saya tidak perlu menyesuaikan diri saat berpindah antar halaman.

#### Acceptance Criteria

1. THE Admin_Panel SHALL menerapkan Design_System yang sama (warna, spacing, tipografi, komponen) di semua 11 halaman: Login, Dashboard, Clients, Products, Product Master, Providers, Transactions, Payments, Payment Methods, Transfers, dan Disbursement Methods.
2. THE Admin_Panel SHALL mengganti semua penggunaan warna `indigo-{n}` dengan `blue-{n}` yang setara (misalnya `indigo-600` → `blue-600`, `indigo-50` → `blue-50`) di seluruh file halaman dan komponen.
3. THE Admin_Panel SHALL mengganti semua penggunaan warna `slate-{n}` di komponen yang menghadap pengguna dengan `gray-{n}` yang setara agar palet warna lebih seragam.
4. THE Admin_Panel SHALL mempertahankan warna-warna semantik yang sudah ada (`emerald` untuk sukses, `red` untuk error, `amber` untuk peringatan) karena warna ini memiliki makna universal yang tidak perlu diubah.
5. THE Admin_Panel SHALL menggunakan `border-radius` yang konsisten: `rounded-lg` (8px) untuk tombol dan input, `rounded-xl` (12px) untuk card dan container medium, `rounded-2xl` (16px) untuk modal dan card besar.
6. THE Admin_Panel SHALL menggunakan `transition-all duration-200` pada semua elemen interaktif (tombol, link, input, card) untuk memberikan kesan animasi yang halus dan seragam.

---

### Requirement 12: Responsivitas dan Aksesibilitas Dasar

**User Story:** Sebagai admin, saya ingin admin panel tetap dapat digunakan di layar yang berbeda ukurannya dan dapat dinavigasi menggunakan keyboard, sehingga saya dapat bekerja dengan nyaman dari berbagai perangkat.

#### Acceptance Criteria

1. THE Admin_Panel SHALL menggunakan layout grid responsif Tailwind dengan breakpoint `md:` dan `lg:` untuk komponen Stat_Card dan section dua kolom agar tidak overflow di layar dengan lebar minimal 1024px.
2. THE Data_Table SHALL membungkus elemen `<table>` dalam container `overflow-x-auto` agar tabel dapat di-scroll secara horizontal di layar yang lebih kecil dari lebar konten tabel.
3. THE Admin_Panel SHALL menambahkan atribut `aria-label` yang deskriptif pada semua tombol yang hanya menampilkan icon (tanpa teks label) seperti tombol edit, delete, copy, dan refresh.
4. THE Admin_Panel SHALL mempertahankan rasio kontras warna minimal 4.5:1 antara teks dan background untuk semua teks berukuran normal, sesuai WCAG 2.1 AA.
5. WHEN admin menggunakan keyboard Tab untuk navigasi, THE Admin_Panel SHALL menampilkan focus indicator yang terlihat jelas (focus ring `blue-500`) pada semua elemen interaktif.
