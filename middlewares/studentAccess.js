const { createHash, timingSafeEqual } = require('node:crypto');

const hash = value => createHash('sha256').update(value).digest();
module.exports = (req, res, next) => {
  const { STUDENT_USERNAME: user, STUDENT_PASSWORD: password } = process.env;
  res.set('Cache-Control', 'no-store');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && ['cross-site', 'same-site'].includes(req.get('Sec-Fetch-Site'))) {
    return res.status(403).json({ message: 'Permintaan lintas situs tidak diizinkan.' });
  }
  if (!user && !password) {
    if (['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)) return next();
    return res.status(403).json({ message: 'Akses lokal saja. Atur akun mahasiswa pada server.' });
  }
  if (!user || !password) return res.status(503).json({ message: 'Konfigurasi akun mahasiswa belum lengkap.' });
  const authorization = /^Basic ([A-Za-z0-9+/=]+)$/i.exec(req.get('Authorization') || '');
  if (authorization && timingSafeEqual(hash(Buffer.from(authorization[1], 'base64')), hash(`${user}:${password}`))) return next();
  res.set('WWW-Authenticate', 'Basic realm="RuangPaham", charset="UTF-8"').status(401).json({ message: 'Masuk dengan akun uji mahasiswa.' });
};