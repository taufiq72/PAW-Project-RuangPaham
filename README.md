# RuangPaham AI — Week 10

Kelanjutan project Week 7: katalog dokumen materi perkuliahan menggunakan **Node.js, Express 5, EJS, Tailwind CDN, dan SQLite**. Judul, jumlah halaman, serta status dokumen kini disimpan dalam database, bukan array sementara. Fitur unggah PDF atau AI belum diimplementasikan; resource CRUD adalah metadata dokumen.

## Menjalankan lokal (Windows / macOS / Linux)

Prasyarat: **Node.js 22.13+ (disarankan Node.js 24 LTS)**, npm dan Git. Tidak perlu MySQL/XAMPP atau password database. Internet diperlukan untuk instalasi dependency dan Tailwind CDN. Stylesheet dasar lokal mempertahankan tampilan jika CDN tidak dapat diakses.

```sh
git clone https://github.com/taufiq72/PAW-Project-RuangPaham.git
cd PAW-Project-RuangPaham
npm ci
npm start
```

Jika sudah memiliki clone, jalankan `git pull` lalu `npm ci` dan `npm start`. Buka **http://localhost:3000**. Database otomatis dibuat pada `data/ruangpaham.sqlite` dan diisi tiga dokumen awal hanya saat tabel pertama kali dibuat. Data tetap tersimpan setelah server dihentikan/dijalankan ulang. Menghapus seluruh dokumen tidak menyebabkan data contoh muncul kembali.

Opsional: salin `.env.example` menjadi `.env` (`Copy-Item .env.example .env` di PowerShell), lalu atur `PORT` atau `DATABASE_PATH`. Konfigurasi default sudah dapat digunakan. `.env`, file database, hasil test, dan `node_modules` tidak diunggah ke Git. Dependency dipulihkan dengan `npm ci`.

## Struktur MVC

```text
config/database.js            Koneksi SQLite, skema, inisialisasi data awal
models/documentModel.js       Query parameterized untuk seluruh operasi data
middlewares/loggerMiddleware.js  Timestamp, HTTP method, path, response status
controllers/                  Penanganan request API dan render halaman
routes/                       Routing web dan REST API
views/index.ejs               Halaman EJS dengan Tailwind CDN
public/documents.js           Fetch API, form, detail, edit, hapus dan feedback
utils/documentValidation.js   Validasi payload dan ID
app.js                        Inisialisasi Express dan error handler
```

## Database

Tabel `documents`: `id` (INTEGER PRIMARY KEY AUTOINCREMENT), `title` (TEXT, 1–200 karakter), `status` (`Siap` / `Diproses`), `pages` (INTEGER, 1–10000), `created_at`, `updated_at` (timestamp UTC). Skema dan seed ada di `config/database.js`. Query hanya berada pada model/config, tidak di controller. Tidak ada layanan database eksternal yang perlu dinyalakan.

## REST API

| Method | Endpoint | Hasil |
| --- | --- | --- |
| GET | `/api/status` | Status server dan koneksi database |
| GET | `/api/dokumen` | Semua dokumen, terbaru dahulu |
| GET | `/api/dokumen/:id` | Detail dokumen |
| POST | `/api/dokumen` | Tambah dokumen (201 + header Location) |
| PUT | `/api/dokumen/:id` | Ubah semua atribut dokumen (200) |
| DELETE | `/api/dokumen/:id` | Hapus dokumen (200) |

`/api/produk` dan `/api/produk/:id` tetap tersedia sebagai alias kompatibilitas endpoint Week 7 untuk seluruh method di atas; keduanya mengakses tabel yang sama.

Body JSON POST / PUT (header `Content-Type: application/json`):

```json
{ "title": "Modul Basis Data.pdf", "pages": 24, "status": "Siap" }
```

Response sukses: `{ "status": "Success", "data": ... }` (DELETE mengembalikan pesan sukses). Payload/ID tidak valid menghasilkan 400, ID tidak ditemukan 404, body terlalu besar 413, kesalahan internal 500 dengan pesan umum. PUT memerlukan ketiga atribut. SQL menggunakan parameter binding, input divalidasi, judul di-escape EJS dan ditampilkan melalui `textContent` di browser.

## Pengujian backend

```sh
npm test
```

Menggunakan HTTP client bawaan Node (tool sejenis Postman) terhadap server Express nyata dan SQLite sementara. Mencakup GET list/detail, POST, PUT, DELETE, alias lama, status error, validasi, malformed JSON, escaping judul, logger, persistensi melalui proses Node kedua, serta pencegahan reseed setelah katalog kosong. Database lokal pengguna tidak disentuh.

Untuk demo Postman, import **docs/RuangPaham.postman_collection.json**, lalu jalankan collection berurutan dengan server menyala. Variable `baseUrl` default `http://localhost:3000`; POST otomatis menyimpan `documentId` untuk detail, PUT, dan DELETE berikutnya. Collection hanya menghapus dokumen yang dibuat oleh request POST tersebut.

## Pengujian frontend

```sh
npx playwright install chromium --only-shell
npm run test:frontend
```

Browser Chromium headless menguji tambah lewat form → periksa SQLite → edit → periksa SQLite → reload → detail → batal hapus → hapus → periksa SQLite. Juga menguji kegagalan jaringan, tombol muat ulang dan lebar layar mobile. Screenshot tersimpan di `test-results/` (diabaikan Git). Jika memakai Chromium yang sudah terpasang, set `CHROMIUM_PATH` ke executable-nya. Test menggunakan database sementara terisolasi.

Demo manual di browser:
1. Buka `/` dan cek tiga data awal, lalu klik **Detail**.
2. Klik **Tambah Dokumen**, isi form dan **Simpan**. Kartu muncul tanpa reload manual.
3. Klik **Edit**, ubah judul/halaman/status dan simpan.
4. Refresh browser atau restart server: perubahan tetap ada.
5. Klik **Hapus**, batalkan untuk memastikan data tetap ada, kemudian konfirmasi hapus.
6. Cocokkan melalui `/api/dokumen` atau buka file SQLite menggunakan extension SQLite di VS Code. Lihat log request pada terminal server.

Contoh query pemeriksaan: `SELECT * FROM documents ORDER BY id DESC;`.

## Cakupan

Project lokal untuk tugas CRUD. API belum memiliki autentikasi/otorisasi sehingga jangan menggunakan data pribadi atau mempublikasikannya sebagai aplikasi multi-user sebelum menambahkan kontrol akses.

Referensi struktur tugas: https://github.com/Kakonoomoide/PAW-ANTARA-WEEK9
