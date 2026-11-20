const fs = require('node:fs');
const path = require('node:path');
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) process.loadEnvFile(envPath);
const express = require('express');
const logger = require('./middlewares/loggerMiddleware');
const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(logger);
app.use(require('./middlewares/studentAccess'));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', require('./routes/apiRoutes'));
app.use('/', require('./routes/webRoutes'));
app.use((req, res) => res.status(404).json({ status: 'Error', message: 'Halaman atau endpoint tidak ditemukan.' }));
app.use((error, req, res, next) => {
  if (error.type === 'entity.parse.failed') return res.status(400).json({ status: 'Error', message: 'Format JSON tidak valid.' });
  if (error.type === 'entity.too.large') return res.status(413).json({ status: 'Error', message: 'Request terlalu besar.' });
  console.error(error);
  res.status(500).json({ status: 'Error', message: 'Terjadi kesalahan pada server.' });
});
if (require.main === module) {
  const port = process.env.PORT || 3000;
  const host = process.env.HOST || 'localhost';
  app.listen(port, host, () => {
    console.log(`Server RuangPaham AI berjalan di http://${host}:${port}`);
    void require('./services/pdfIndex.service').processPending();
  });
}
module.exports = app;
