# DUEL BOXING

Website game/social platform untuk menemukan lawan tanding olahraga bela diri (boxing, kickboxing, MMA, martial arts) di sekitar lokasi kamu — cari di map, swipe seperti Tinder, match, lalu ajukan **duel olahraga terkontrol** di arena virtual.

⚠️ **DUEL BOXING bukan ajakan kekerasan nyata.** Semua "duel" adalah pertandingan olahraga bela diri yang disepakati kedua pihak. Pertandingan fisik hanya boleh dilakukan di tempat resmi/aman (gym, sports arena) dengan pengawasan yang sesuai. Lihat halaman **Safety & Rules** di dalam aplikasi.

## Fitur

- 🗺️ Map interaktif (Leaflet + OpenStreetMap) menampilkan pemain di sekitar lokasi kamu (lokasi approximate, bukan alamat presisi)
- 👆 Swipe kanan (challenge) / kiri (pass) ala Tinder di halaman **Find Opponent**
- 🎉 Sistem Match otomatis saat saling menantang
- ⚔️ Alur Challenge → Terima/Tolak → Duel Room dengan timer & scoring (Point/Technique/Speed/Control)
- 💬 Chat setelah match, lengkap dengan Report & Block
- 🏆 Ranking global/friends, sistem Level/XP, dan rating ala Elo
- 🎟️ Halaman Tournament dengan bracket demo
- 👤 Profile lengkap dengan match history & achievements
- 🛠️ Admin dashboard (login dengan username yang mengandung kata "admin", mis. `admin1`)
- 📱 Mobile-first, responsive untuk Android/iPhone/tablet/laptop/desktop
- 📲 PWA-ready (bisa di-install seperti aplikasi)

## Menjalankan secara lokal

Karena app ini pure static (HTML/CSS/JS + LocalStorage), cukup buka lewat local server (bukan `file://`, supaya service worker & fetch bekerja normal):

```bash
cd duel-boxing
python3 -m http.server 8080
# buka http://localhost:8080
```

Login demo: klik **"masuk sebagai tamu demo"** di halaman login, atau daftar akun baru — semuanya tersimpan di LocalStorage browser kamu.

## Deploy ke GitHub Pages

1. Buat repository baru di GitHub, lalu upload seluruh file (semuanya rata di root, tanpa folder) ke root repo — atau push lewat git:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Duel Boxing"
   git branch -M main
   git remote add origin https://github.com/USERNAME/REPO.git
   git push -u origin main
   ```
2. Di GitHub: **Settings → Pages → Source → Deploy from a branch → `main` / `root`**.
3. Tunggu beberapa menit, situs akan aktif di `https://USERNAME.github.io/REPO/`.

Tidak perlu build step — semua file sudah siap pakai (vanilla HTML/CSS/JS).

## Struktur proyek

Semua file sengaja diletakkan rata (flat) sejajar `index.html` — tidak ada subfolder — supaya gampang di-upload/dikelola langsung dari root repo GitHub:

```
index.html          # Single-page app: auth + seluruh view (map, duel, match, rank, dst)
style.css            # Design tokens & seluruh komponen
responsive.css        # Breakpoints mobile → desktop
animations.css          # Keyframes ringan
data.js              # LocalStorage layer + dummy player data (siap diganti Firebase)
avatars.js            # Generator avatar SVG unik per username (fail-safe, tanpa file gambar)
map.js                  # Leaflet map + geolocation + filter
players.js               # Swipe deck, player profile modal, matches list
duel.js                   # Challenge flow, Duel Room, Tournament
chat.js                    # Chat pasca-match + report/block
ranking.js                  # Leaderboard
admin.js                     # Admin dashboard
app.js                        # Router, auth, topbar, notifications, profile
logo.svg
icon-192.svg, icon-512.svg
manifest.json
service-worker.js
```

## Menghubungkan ke Firebase (langkah selanjutnya)

Semua fungsi baca/tulis data ada terpusat di `data.js` (mis. `getUsers()`, `saveUser()`, `createMatch()`, `createChallenge()`, dst). Untuk migrasi ke backend nyata:

1. Ganti isi setiap fungsi di `data.js` dari `localStorage`/`JSON.parse` menjadi pemanggilan Firestore/Realtime Database (mis. `getDocs`, `setDoc`, `onSnapshot` untuk data real-time).
2. Ganti simulasi lawan (`recordSwipe`, auto-accept challenge) dengan event real dari user lain.
3. Untuk lokasi real-time, gunakan `navigator.geolocation.watchPosition` dan tulis update ke Firestore secara berkala (sudah ada fallback approximate location di `map.js`).
4. UI (semua file di atas `data.js`) tidak perlu diubah banyak karena sudah memanggil lewat fungsi-fungsi tersebut.

## Changelog v9 — dummy bertingkah lebih "hidup"

- **Pesan spontan**: dummy yang sudah match denganmu sekarang bisa mengirim pesan tiba-tiba tanpa kamu chat duluan (mis. "Eh, kapan kita tanding nih?"), lengkap dengan notifikasi 💬 dan toast kalau chat sedang tertutup.
- **Indikator "sedang mengetik..."**: saat kamu kirim pesan ke dummy, muncul bubble titik-titik animasi dulu sebelum balasannya muncul — lebih terasa seperti ngobrol sama orang beneran.
- **Gelembung chat di peta**: saat dummy mengirim pesan spontan dan kamu sedang di halaman Map, marker mereka menampilkan ikon 💬 berdenyut selama beberapa detik.
- **Notifikasi ambient "melihat profil"**: sesekali muncul notifikasi seperti "👀 NIGHTFOX melihat profil kamu" — sekadar detail kecil yang bikin arena terasa ramai beneran.
- Semua berjalan independen dari simulasi tantangan duel yang sudah ada sebelumnya, jadi aktivitasnya makin variatif: gerak di peta, ganti status, duel sesama dummy di background, kirim pesan, dan mengajak duel — semua jalan bersamaan.
- Diverifikasi dengan browser sungguhan: typing indicator muncul lalu hilang otomatis, pesan spontan tersimpan & memicu notifikasi, gelembung chat di marker aktif — tanpa error JavaScript.

## Changelog v8 — lawan dummy tidak muncul di peta (bug data lama "nyangkut")

- **Akar masalah**: dummy player disimpan sekali di localStorage saat pertama kali dibuka. Karena default lokasi baru saja dipindah ke Parung (v7), siapa pun yang sudah pernah membuka aplikasi ini sebelumnya (data lama masih tersimpan di browser/perangkatnya) akan tetap melihat dummy ter-seed di lokasi LAMA (Jakarta) — jauh di luar area peta yang sekarang ditampilkan di Parung, sehingga terlihat seperti "tidak ada lawan sama sekali".
- **Perbaikan**: `seedDummyPlayers()` sekarang mengecek jarak dummy yang tersimpan terhadap pusat peta saat ini. Kalau lebih dari 15 KM (indikasi data lama/usang), seluruh dummy otomatis dihapus dan di-seed ulang di sekitar lokasi baru — tanpa perlu pengguna menghapus data manual.
- Diverifikasi dengan mensimulasikan persis kondisi di laporan (data dummy lama di Jakarta) lewat browser sungguhan: 12 dummy otomatis pindah ke sekitar Parung dan 12 marker berhasil tampil di peta.
- Status online/away/offline dummy (dari fitur "dummy lebih aktif" sebelumnya) tetap jalan seperti biasa setelah migrasi ini.

## Changelog v7 — peta dikunci fokus ke Parung, Bogor

- Sebelumnya peta mencoba meminta GPS asli perangkat saat pertama dibuka, dan diam-diam memindahkan pusat peta ke lokasi asli penguji (bisa di kota manapun) — ini bikin demo tidak konsisten dan tidak sesuai permintaan "fokus ke Parung, Bogor".
- Sekarang permintaan GPS otomatis dihapus. Peta **selalu** dibuka terpusat di **Parung, Kabupaten Bogor, Jawa Barat** (koordinat -6.4223, 106.7327), dan seluruh dummy player di-seed di sekitar titik itu juga.
- Mesin peta tetap **Leaflet + OpenStreetMap** (gratis, tanpa API key) sesuai pilihan yang dikonfirmasi — beralih ke Google Maps sungguhan butuh API key berbayar/kuota dari akun Google Cloud pengguna sendiri.
- Diverifikasi dengan browser sungguhan tanpa izin lokasi apapun: peta tetap terbuka tepat di Parung setiap saat.

## Changelog v6 — dummy lebih "hidup" + lokasi default diperbarui

- **Dummy sekarang benar-benar aktif**: setiap ~7 detik, beberapa dummy player bergerak sedikit di sekitar titik asal mereka (seperti benar-benar jalan-jalan), status online/away/offline berubah-ubah, dan sesekali dua dummy "bertarung" di latar belakang (menang/kalah + perubahan rating tercatat).
- **Ticker aktivitas live** ditambahkan di halaman Map (di atas peta) — menampilkan kejadian seperti "🥊 VIPER_K mengalahkan RAVEN_X (+11 rating)" atau "⚡ NIGHTFOX baru saja online" secara bergantian, dengan indikator titik merah berdenyut.
- **Frekuensi tantangan masuk dari dummy** dipercepat (20 detik → 14 detik, peluang 35% → 50%) supaya arena terasa lebih ramai.
- **Lokasi default (fallback GPS)** diganti dari Jakarta ke **Parung, Kabupaten Bogor, Jawa Barat** sesuai lokasi yang diminta.
- Diverifikasi langsung dengan browser sungguhan: marker bergerak, status berubah, ticker menampilkan event, tanpa error JavaScript.

## Peta: OpenStreetMap vs Google Maps

Peta saat ini masih pakai **Leaflet + OpenStreetMap** (gratis, tanpa API key, dan sudah terbukti stabil setelah semua perbaikan bug sebelumnya). Untuk mengganti ke **Google Maps sungguhan** (bukan cuma link/foto, tapi peta interaktif dengan marker & popup seperti sekarang), dibutuhkan **Google Maps JavaScript API key** dari Google Cloud Console — ini milik akun Google Anda sendiri (ada kuota gratis bulanan, tapi perlu akun billing aktif). Saya tidak bisa membuatkan API key untuk Anda.

## Changelog v5 — akar masalah blur/tumpang-tindih ditemukan & diverifikasi

Dari rekaman layar Anda, ditemukan bahwa "IT'S A MATCH!" **modal terbuka dengan benar**, tapi popup/marker peta (Leaflet) **tidak ikut tersembunyi** — keduanya bertumpuk di layar yang sama. Ini karena elemen Leaflet memakai CSS `transform` secara internal yang bisa "lolos" dari urutan `z-index` biasa di sejumlah WebView, membuatnya terasa seperti area blur/hilang secara acak.

Perbaikan (sudah diverifikasi lewat pengujian otomatis end-to-end: Map → Challenge → Match → Duel Room → Hasil, dengan tangkapan layar nyata di setiap tahap):

- **`isolation: isolate` ditambahkan ke `.leaflet-map`** — mengunci semua elemen peta (marker, popup) di dalam batas stacking context-nya sendiri, sehingga tidak akan pernah lagi menembus ke atas modal/header meski browser salah urutan compositing.
- **Popup peta ditutup otomatis** setiap kali tombol PROFIL/CHALLENGE di dalamnya membuka modal kita sendiri (`MapModule.closePopup()`), jadi tidak akan ada dua kartu bertumpuk lagi.
- **Panel notifikasi sekarang punya tombol tutup (×)** eksplisit — sebelumnya hanya bisa ditutup dengan tap di luar panel.
- Semua perbaikan di atas diverifikasi langsung dengan merender halaman menggunakan browser sungguhan (bukan cuma baca kode), termasuk skenario match ditemukan, mengisi form challenge, menerima tantangan, sampai menyelesaikan duel — semuanya bersih tanpa elemen bertumpuk atau blur.

## Changelog v4 — perbaikan glitch render WebView

- **Akar masalah area gelap kosong di atas peta**: kemungkinan besar disebabkan kombinasi `position: sticky`/`fixed` bersama `backdrop-filter: blur()` pada topbar dan bottom-nav — kombinasi ini dikenal luas menyebabkan glitch render "blank/hitam" saat scroll di berbagai WebView Android. Diganti ke background solid (tanpa blur) untuk topbar & bottom-nav sehingga hilang risikonya sepenuhnya.
- **Tinggi peta memakai `vh`** yang bisa salah hitung di dalam WebView/preview yang viewport aktualnya berbeda dari device penuh. Ditambahkan `dvh` (dynamic viewport height) yang menyesuaikan tinggi visual sebenarnya, dengan `vh` tetap sebagai fallback.
- **Sentuhan/drag di peta bisa "membocorkan" scroll ke halaman** di belakangnya (menyebabkan tampilan seperti melompat/tergeser). Ditambahkan `overscroll-behavior: contain` pada peta, swipe-stage, dan body.
- **Popup peta memakai `autoPan` bawaan Leaflet** yang diam-diam bisa menggeser peta saat marker dekat tepi di-tap — dimatikan (`autoPan:false`) supaya tidak ada pergeseran otomatis yang tidak diinginkan.

Catatan: satu elemen (lingkaran kecil dengan ikon × / chevron yang muncul di posisi layar yang sama persis di kedua screenshot, terlepas dari state aplikasi) kemungkinan besar adalah tombol UI bawaan aplikasi code‑editor/preview yang dipakai, bukan bagian dari kode ini — DOM halaman ini tidak punya elemen pada posisi tersebut.

## Changelog v3 — perbaikan tampilan (visual bugs)

- **Header/topbar berpotensi hilang saat di-scroll**: `overflow-x:hidden` di `<body>` adalah penyebab umum `position:sticky` gagal bekerja di sejumlah WebView/browser (memaksa terbentuknya scroll container baru). Diganti ke `overflow-x:clip` (dengan fallback `hidden` untuk browser lama) supaya header tetap menempel di atas seperti seharusnya.
- **Ikon lonceng notifikasi dobel** di topbar (mobile) dihapus — sekarang cuma satu tombol 🔔, konsisten di semua ukuran layar.
- **Kontrol zoom peta (+/-) dan kotak attribution "Leaflet | © OpenStreetMap"** sebelumnya masih tampilan default Leaflet (putih terang, nabrak tema gelap). Sekarang di-restyle penuh: dark glass, border neon tipis, dan branding "Leaflet" dihapus (`prefix:false`) — hanya menyisakan kredit OSM yang memang wajib, dengan gaya yang menyatu ke tema.
- **Marker pemain di peta** diperkuat efek glow-nya (radial gradient + text-shadow + box-shadow lebih tebal) supaya lebih terasa "neon cyber arena" sesuai konsep awal, bukan cuma lingkaran datar.
- Tombol close (×) pada popup peta di-restyle agar warnanya konsisten dengan tema gelap alih-alih abu-abu default Leaflet.

## Changelog — perbaikan bug & tampilan (update ini)

- **Alur duel yang buntu**: setelah challenge diterima, tombol di kartu Match sekarang berubah jadi "🥊 MULAI DUEL" (sebelumnya tetap "AJUKAN DUEL" dan tidak bisa masuk Duel Room).
- **Tantangan masuk (incoming challenge) tidak pernah muncul**: sekarang lawan yang sudah match dengan kamu bisa mengirim tantangan balik secara berkala, memicu modal terima/tolak yang sebelumnya jadi kode mati.
- **Bug rating terbalik**: saat menang, lawan (dummy) yang seharusnya turun rating malah naik. Sudah diperbaiki — rating lawan sekarang selalu kebalikan dari rating kamu.
- **Auto-reply chat bisa terpicu berkali-kali** setiap chat dibuka ulang. Sekarang hanya terpicu sekali per pesan yang kamu kirim.
- **Kolom pencarian di Map tidak berfungsi** (hanya tampilan). Sekarang benar-benar memfilter marker dan otomatis fly-to pemain yang cocok.
- **Filter Country/City di Ranking palsu** (selalu menampilkan semua orang). Sekarang benar-benar memfilter berdasarkan kota/negara pemain, dan tombol filter (Global/Country/City/Friends) yang sebelumnya tidak ter-klik sekarang berfungsi.
- **Filter Level & Rating di Map** ditambahkan (sebelumnya hilang dari modal filter meski disebut di spesifikasi).
- **Memory leak pada swipe card**: setiap render menambah event listener baru ke `window` tanpa dibersihkan. Sekarang listener drag dipasang sekali saja.
- **Duel Room bisa tertutup tidak sengaja** dengan klik di luar modal, padahal timer tetap berjalan di background. Sekarang harus lewat tombol END MATCH.
- **Keamanan tampilan (XSS/markup rusak)**: username, pesan chat, dan teks lain yang berasal dari input pengguna sekarang selalu di-escape sebelum dirender, dan username baru divalidasi (3–16 karakter, huruf/angka/underscore).
- **Status profil selalu tampil "Online"** walau kamu ubah ke Away/Offline di Edit Profile — sudah diperbaiki agar sesuai status sebenarnya.
- **Admin dashboard tidak bisa diakses lewat mobile** (hanya ada di sidebar desktop). Sekarang muncul juga sebagai tombol di halaman Profile untuk akun admin.
- **Cache PWA** dinaikkan versinya supaya perangkat yang sudah pernah membuka versi lama tidak terus memuat file basi dari service worker.
- Rebrand nama produk dari **DUEL ARENA** menjadi **DUEL BOXING** di seluruh halaman, judul, manifest PWA, dan dokumen ini.

## Catatan privasi & keamanan

- Lokasi pemain ditampilkan sebagai radius/perkiraan jarak (KM), bukan koordinat presisi.
- Ada fitur Report & Block di setiap chat.
- Semua pertandingan memerlukan persetujuan kedua pihak (challenge harus diterima).
- Halaman **Community Rules** wajib dibaca dan berisi aturan keselamatan.
