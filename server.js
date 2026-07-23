require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const contactRoutes = require('./routes/contactRoutes');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/call-management';

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected successfully to MongoDB.'))
  .catch((err) => {
    console.error('Database Connection Error:', err.message);
    process.exit(1);
  });

// --- Middlewares ---
app.use(cors());
// Disable CSP (Content Security Policy) to easily load external fonts (Google Fonts Inter)
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- View Engine Setup ---
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// --- Static Directories Mapping ---
// Serve local public folder (css, js, images)
app.use(express.static(path.join(__dirname, 'public')));
// Serve local bootstrap assets directly from npm installation directories
app.use('/bootstrap', express.static(path.join(__dirname, 'node_modules/bootstrap/dist')));
app.use('/bootstrap-icons', express.static(path.join(__dirname, 'node_modules/bootstrap-icons/font')));

// --- Route Mounting ---
app.use('/', contactRoutes);

// --- 404 Route Catch-all ---
app.use((req, res, next) => {
  res.status(404).render('error', {
    message: 'The page you are looking for does not exist.'
  });
});

// --- Global Error Handler ---
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).render('error', {
    message: err.message || 'An internal server error occurred.'
  });
});

// --- Start Listening ---
app.listen(PORT, () => {
  console.log(`Server is running in production mode at http://localhost:${PORT}`);
});
