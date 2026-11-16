const express = require('express');
const path = require('path');
require('dotenv').config();

// Import Middleware & Routes yang sudah ada di project Anda
const loggerMiddleware = require('./middlewares/loggerMiddleware');
const apiRoutes = require('./routes/apiRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Konfigurasi View Engine EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware Global
app.use(loggerMiddleware); // Mempertahankan logger tugas sebelumnya
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Pendaftaran Endpoint API
app.use('/api', apiRoutes);

// Route Halaman Utama (Frontend Web)
app.get('/', (req, res) => {
    res.render('index', { 
        title: 'RuangPaham AI — Asisten Belajar Interaktif' 
    });
});

// Penanganan Route 404 (Not Found)
app.use((req, res) => {
    res.status(404).send('Halaman RuangPaham tidak ditemukan.');
});

// Menjalankan Server
app.listen(PORT, () => {
    console.log(`Server RuangPaham AI berjalan di http://localhost:${PORT}`);
});

module.exports = app;