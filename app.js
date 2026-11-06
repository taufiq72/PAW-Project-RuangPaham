const express = require('express');
const path = require('path');
const logger = require('./middlewares/loggerMiddleware');
const apiRoutes = require('./routes/apiRoutes');
const webRoutes = require('./routes/webRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Setup View Engine EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Mount Middleware Logger Custom
app.use(logger);

// Middleware Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routing
app.use('/api', apiRoutes);
app.use('/', webRoutes);

app.listen(PORT, () => {
  console.log(`Server RuangPaham AI berjalan di http://localhost:${PORT}`);
});