# WordRush - Web Game

Fast-paced multiplayer word game inspired by traditional Indonesian "ABC 5 Dasar" with real-time Socket.io communication.

## 🎮 Tentang Game

WordRush is a modern web-based multiplayer word game inspired by the traditional Indonesian game "ABC 5 Dasar". Pemain harus menjawab kata sesuai tema dan syarat yang diberikan secara acak.

### Fitur Utama:
- **Multiplayer Real-time**: Bermain bersama pemain lain secara langsung
- **Sistem Tema**: Hewan, Buah, Bunga, Negara, Makanan, Profesi
- **Syarat Dinamis**: Huruf awalan, akhiran, atau jumlah huruf
- **Chat Live**: Semua jawaban ditampilkan secara real-time
- **Leaderboard**: Ranking pemain berdasarkan skor
- **Limit Jawaban**: Maksimal 3 jawaban per round
- **Anti-Duplikasi**: Jawaban duplikat tidak dihitung

## 🛠️ Teknologi

- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: Node.js, Express, Socket.io
- **Database**: MongoDB
- **Real-time Communication**: WebSocket

## 🚀 Instalasi & Menjalankan

### Prerequisites
- Docker & Docker Compose
- Git

### 🐳 Menggunakan Docker (Recommended)

#### 1. Clone Repository
```bash
git clone <repository-url>
cd word-game
```

#### 2. Jalankan dengan Docker Compose

**Development Mode:**
```bash
docker-compose -f docker-compose.dev.yml up --build
```

**Production Mode:**
```bash
docker-compose up --build
```

#### 3. Akses Game
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- MongoDB: localhost:27017

#### 4. Stop Services
```bash
docker-compose down
```

### 💻 Manual Installation (Alternative)

#### Prerequisites
- Node.js (v16 atau lebih baru)
- MongoDB (lokal atau cloud)
- npm atau yarn

#### 1. Setup Backend
```bash
cd server
npm install
```

Buat file `.env` di folder `server`:
```env
MONGODB_URI=mongodb://localhost:27017/abc5dasar
PORT=5000
NODE_ENV=development
```

Jalankan server:
```bash
npm run dev
```

#### 2. Setup Frontend
```bash
cd ../client
npm install
```

Jalankan frontend:
```bash
npm run dev
```

#### 3. Akses Game
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 🎯 Cara Bermain

1. **Masuk Game**: Masukkan nama pemain dan klik "Mulai Bermain"
2. **Tunggu Round**: Sistem akan memulai round baru setiap 60 detik
3. **Lihat Syarat**: Perhatikan tema dan syarat yang diberikan
4. **Kirim Jawaban**: Ketik jawaban sesuai syarat (maksimal 3 jawaban)
5. **Lihat Hasil**: Jawaban benar akan mendapat 10 poin
6. **Kompetisi**: Bersaing dengan pemain lain di leaderboard

## 📋 Aturan Game

- ✅ Setiap round berlangsung 60 detik
- ✅ Maksimal 3 jawaban per pemain per round
- ✅ Jawaban harus sesuai tema dan syarat
- ✅ Duplikasi jawaban: yang pertama submit yang dapat poin
- ✅ Setiap jawaban benar = 10 poin
- ✅ Total skor = akumulasi semua jawaban benar

## 🏗️ Struktur Project

```
word-game/
├── server/                 # Backend Node.js
│   ├── server.js          # Main server file
│   ├── package.json       # Backend dependencies
│   └── .env              # Environment variables
├── client/                # Frontend Next.js
│   ├── pages/            # Next.js pages
│   ├── components/       # React components
│   ├── styles/          # CSS styles
│   └── package.json     # Frontend dependencies
└── README.md            # Documentation
```

## 🔧 Development

### Backend Development
```bash
cd server
npm run dev  # Menggunakan nodemon untuk auto-reload
```

### Frontend Development
```bash
cd client
npm run dev  # Next.js development server
```

## 🚀 Deployment

### Backend (Heroku/Railway)
1. Set environment variables
2. Deploy dengan `git push` atau platform deployment

### Frontend (Vercel/Netlify)
1. Build project: `npm run build`
2. Deploy static files

## 🤝 Kontribusi

1. Fork repository
2. Buat feature branch
3. Commit perubahan
4. Push ke branch
5. Buat Pull Request

## 📝 License

MIT License - Lihat file LICENSE untuk detail lengkap.

## 🎉 Happy Gaming!

Enjoy the modern WordRush experience with your friends!
