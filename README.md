# Website Jadwal Pertandingan PERSIB Bandung

Aplikasi web profesional, responsif, dan siap produksi untuk menampilkan dan mengelola jadwal serta hasil pertandingan **PERSIB Bandung** (Pangeran Biru / Maung Bandung). 

Aplikasi ini menggunakan arsitektur serverless yang efisien:
- **Frontend**: HTML5, CSS3, JavaScript modular, Bootstrap 5 & Bootstrap Icons, didesain khusus untuk di-hosting di **GitHub Pages**.
- **Database**: **Google Sheets** sebagai satu-satunya sistem basis data relasional.
- **Backend & REST API**: **Google Apps Script Web App** yang menangani seluruh operasi CRUD, autentikasi administrator, dan integrasi Football API.
- **Zona Waktu**: **Asia/Jakarta (WIB)**.

---

## ⚽ Fitur Utama

### 1. Halaman Publik (`index.html`)
- **Next Match & Live Countdown**: Menghitung mundur (Hari, Jam, Menit, Detik) menuju laga terdekat PERSIB secara real-time.
- **Jadwal & Hasil Pertandingan**: Menampilkan jadwal pertandingan mendatang (*upcoming*) dan hasil skor laga yang telah selesai (*finished*).
- **Statistik Musim**: Menghitung otomatis laga Main, Menang, Seri, Kalah, Gol (GF:GA), Selisih Gol, Total Poin, Win Rate (%), dan Clean Sheets.
- **Filter Fleksibel & Pencarian**: Filter berdasarkan kompetisi (BRI Liga 1, AFC Champions League Two, Piala Presiden), tanggal, serta pencarian instan nama tim atau stadion.
- **Kalender Pertandingan Interaktif**: Tampilan kalender bulanan dengan indikator pertandingan pada tanggal laga dan navigasi antar-bulan.
- **Detail Pertandingan Lengkap**: Modal informasi stadion, kota, wasit, saluran siaran televisi/streaming resmi, dan catatan laga.
- **Sistem Cetak & Export PDF Resmi**:
  - Diformat presisi untuk kertas standar **A4 Portrait** & **A4 Landscape**.
  - Dilengkapi kop surat logo resmi PERSIB, ringkasan statistik musim, dan tanggal cetak (*timestamp* WIB).
  - Pilihan cetak: Seluruh jadwal, berdasarkan bulan tertentu, atau berdasarkan kompetisi.

### 2. Panel Administrator (`admin.html`)
- **Autentikasi Aman**: Login administrator dengan verifikasi password hash SHA-256 dan session token. *(Kredensial bawaan: `admin` / `persib1933`)*.
- **CRUD Jadwal Pertandingan**: Tambah jadwal baru, ubah rincian laga, dan hapus pertandingan.
- **Input & Pembaruan Skor Cepat**: Modal khusus untuk memperbarui skor akhir laga dan mengubah status menjadi `FINISHED` atau `LIVE`.
- **CRUD Tim Lawan & Logo**: Tambah dan kelola daftar tim lawan beserta tautan logo resmi.
- **Manajemen Stadion**: Kelola nama dan kota stadion kandang maupun tandang.
- **Manajemen Kompetisi & Musim**: Mendukung BRI Liga 1, AFC Champions League Two, dan turnamen resmi lainnya.
- **Integrasi Football API**:
  - Pengaturan provider (Football-Data.org / API-Football).
  - Pemicu sinkronisasi manual langsung dari admin panel.
  - Pencegahan data duplikat melalui verifikasi `external_match_id`.
  - Log riwayat sinkronisasi (*Sync Logs*).
- **Database Tools**: Ekspor backup data seluruh 8 sheet dalam format JSON terstruktur dan tombol reset database.

---

## 🗄️ Struktur Database (8 Google Sheets)

Sistem basis data terdiri dari 8 sheet di dalam satu Google Spreadsheet:

| Nama Sheet | Deskripsi | Kolom / Schema Header |
| :--- | :--- | :--- |
| **`users`** | Akun administrator | `id`, `username`, `password_hash`, `role`, `created_at`, `updated_at` |
| **`matches`** | Jadwal & hasil pertandingan | `id`, `external_match_id`, `home_team_id`, `away_team_id`, `competition_id`, `season_id`, `stadium_id`, `match_date`, `match_time`, `home_score`, `away_score`, `status`, `data_source`, `created_at`, `updated_at` |
| **`teams`** | Klub & logo | `id`, `name`, `logo`, `created_at`, `updated_at` |
| **`competitions`** | Kompetisi & turnamen | `id`, `name`, `logo`, `created_at`, `updated_at` |
| **`seasons`** | Musim kompetisi | `id`, `name`, `start_date`, `end_date`, `created_at`, `updated_at` |
| **`stadiums`** | Stadion & kota | `id`, `name`, `city`, `created_at`, `updated_at` |
| **`api_settings`** | Konfigurasi Football API | `id`, `provider`, `enabled`, `updated_at` |
| **`sync_logs`** | Catatan riwayat sinkronisasi | `id`, `sync_type`, `status`, `records_processed`, `message`, `created_at` |

---

## 🚀 Panduan Instalasi & Deployment

### Langkah 1: Setup Google Spreadsheet & Google Apps Script
1. Buat Google Spreadsheet baru di browser Anda melalui [https://sheets.new](https://sheets.new).
2. Beri nama spreadsheet, misalnya: `PERSIB Bandung - Database Pertandingan`.
3. Buka menu **Extensions > Apps Script** di bilah atas spreadsheet.
4. Buat 4 file script di dalam editor Google Apps Script dengan menyalin isi file berikut dari repositori ini:
   - `Code.gs` *(dari `google-apps-script/Code.gs`)*
   - `setup-database.gs` *(dari `google-apps-script/setup-database.gs`)*
   - `import-data.gs` *(dari `google-apps-script/import-data.gs`)*
   - `football-api.gs` *(dari `google-apps-script/football-api.gs`)*
5. Jalankan fungsi **`setupDatabase`** sekali:
   - Pilih fungsi `setupDatabase` di dropdown bilah alat Apps Script, lalu klik **Run (Jalankan)**.
   - Setujui izin akses akun Google Anda (*Review permissions*).
   - Script akan membuat 8 sheet secara otomatis, memasang header dengan warna biru navy PERSIB, dan mengisikan data awal tim, stadion, dan jadwal.

### Langkah 2: Konfigurasi Script Properties (Opsional untuk Football API)
1. Di editor Google Apps Script, buka menu **Project Settings** (ikon roda gigi di menu sebelah kiri).
2. Gulir ke bagian **Script Properties**, klik **Add script property**:
   - Property: `SPREADSHEET_ID` | Value: *[ID Spreadsheet Anda dari URL]*
   - Property: `FOOTBALL_API_KEY` | Value: *[API Token dari Football-Data.org]*
   - Property: `FOOTBALL_LEAGUE_CODE` | Value: `IDN1`
3. Klik **Save script properties**.

### Langkah 3: Deploy sebagai Web App
1. Di editor Google Apps Script, klik tombol biru **Deploy > New deployment** di pojok kanan atas.
2. Klik ikon roda gigi di samping *Select type*, pilih **Web app**.
3. Isi konfigurasi deployment:
   - **Description**: `PERSIB API v1`
   - **Execute as**: **`Me (emailanda@gmail.com)`**
   - **Who has access**: **`Anyone`** *(Wajib agar website frontend dapat memanggil API tanpa login akun Google)*
4. Klik **Deploy**.
5. Salin **Web App URL** yang dihasilkan (format: `https://script.google.com/macros/s/AKfycbx.../exec`).

### Langkah 4: Hubungkan Frontend ke Web App API
Ada dua cara mudah:
- **Cara 1 (Melalui UI Langsung)**: Buka website, klik tombol **API Sheets** di bilah navigasi, tempelkan Web App URL Anda, lalu klik **Simpan Konfigurasi**.
- **Cara 2 (Melalui Berkas Konfigurasi)**: Buka file `assets/js/config.js`, masukkan URL pada variabel `GAS_API_URL`:
  ```javascript
  CONFIG.GAS_API_URL = 'https://script.google.com/macros/s/AKfycbx.../exec';
  ```

### Langkah 5: Pasang Trigger Otomatis (Time-Driven Trigger)
Untuk sinkronisasi otomatis jadwal dan skor setiap 6 jam:
1. Di editor Apps Script, pilih fungsi **`setupSyncTrigger`** pada dropdown fungsi.
2. Klik **Run (Jalankan)**.
3. Trigger otomatis akan terpasang di Google Apps Script dan berjalan di background tanpa perlu membuka browser.

---

## 🌐 Hosting di GitHub Pages

Karena frontend dibangun menggunakan HTML, CSS, dan JavaScript statis tanpa dependensi server Node.js:
1. Buat repository baru di akun GitHub Anda (misalnya `persib-jadwal`).
2. Unggah seluruh file ke root repository:
   ```
   ├── index.html
   ├── admin.html
   ├── assets/
   │   ├── css/style.css
   │   └── js/config.js, api.js, app.js, admin.js, print.js
   ├── google-apps-script/
   └── README.md
   ```
3. Buka tab **Settings** di repository GitHub Anda.
4. Klik menu **Pages** di bilah navigasi sebelah kiri.
5. Pada bagian **Build and deployment**:
   - Source: **Deploy from a branch**
   - Branch: `main` (atau `master`) / Folder: `/ (root)`
6. Klik **Save**. Dalam 1-2 menit, website Anda akan aktif di `https://username.github.io/persib-jadwal/`.

---

## 🧪 Panduan Pengujian Fitur

1. **Pengujian Mode Lokal / Offline Simulator**:
   - Buka `index.html`. Laga terdekat (misalnya PERSIB vs Persija Jakarta) langsung aktif dengan hitung mundur detik.
   - Filter tab *Mendatang*, *Hasil*, dan *Kalender* dapat dicoba langsung.
2. **Pengujian Cetak A4 & PDF**:
   - Klik tombol **Cetak Jadwal (A4/PDF)** di bilah atas.
   - Pilih orientasi *Portrait* atau *Landscape*, lalu klik *Mulai Cetak / Simpan PDF*.
   - Periksa print preview browser: Kop surat PERSIB, ringkasan statistik, dan tabel jadwal tampil rapi dalam format A4.
3. **Pengujian Admin Panel**:
   - Buka `/admin.html`. Masukkan username `admin` dan password `persib1933`.
   - Coba tombol **Update Skor** pada salah satu laga untuk mengubah skor dan status menjadi `FINISHED`.
   - Periksa kembali halaman publik (`index.html`), statistik kemenangan dan poin otomatis bertambah secara real-time!
4. **Pengujian Tambah & Hapus Laga**:
   - Tambah laga baru melalui tombol *Tambah Pertandingan Baru*.
   - Pastikan data tampil di tabel admin dan halaman jadwal publik.

---

## ⚠️ Keterbatasan & Batas Kuota (Quota Limits)

- **Batas Kuota Google Apps Script**:
  - Kuota eksekusi URL Fetch: 20.000 panggilan/hari (akun Gmail standar).
  - Waktu eksekusi maksimum script: 6 menit per panggilan.
  - Untuk efisiensi, script `setup-database.gs` dan `import-data.gs` menggunakan **Batch Operations** (`setValues` sekaligus) daripada menulis baris per baris.
- **Football API Rate Limit**:
  - Akun gratis Football-Data.org memiliki batas 10 request/menit. Trigger otomatis 6 jam sekali dirancang aman dan tidak akan melampaui batas ini.
  - Jika kuota API habis atau API sedang down, sistem otomatis menggunakan mekanisme fallback data yang telah tersimpan di Google Sheets tanpa mengganggu tampilan website pengunjung.

---

## 🛡️ Keamanan

- Password administrator di-hash menggunakan algoritma **SHA-256**, tidak disimpan dalam bentuk teks polos (*plaintext*).
- API Key Football API disimpan secara terenkripsi di Google Apps Script **Script Properties** di server Google, sehingga tidak terekspos di browser pengunjung.
- Hak akses eksekusi Web App diamankan dengan validasi token sesi untuk setiap aksi yang mengubah data (`POST`).
