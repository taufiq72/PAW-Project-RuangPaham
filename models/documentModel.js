const documents = [
  { id: 1, title: 'Modul 1 - Pengenalan Web Dev.pdf', status: 'Siap', pages: 12 },
  { id: 2, title: 'Slide Pertemuan 2 - Express.js MVC.pdf', status: 'Siap', pages: 25 },
  { id: 3, title: 'Buku Ajar Pemrograman Web Lanjut.pdf', status: 'Diproses', pages: 110 }
];

module.exports = {
  getAllDocuments: () => documents
};