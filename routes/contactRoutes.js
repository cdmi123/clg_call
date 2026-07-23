const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const contactController = require('../controllers/contactController');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter (Only .xls and .xlsx)
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === '.xlsx' || ext === '.xls') {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only .xlsx and .xls Excel files are allowed.'));
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Core Page Routes
router.get('/', contactController.renderDashboard);
router.get('/upload', contactController.renderUpload);

// Actions
router.post('/upload', upload.single('excelFile'), contactController.uploadExcel);
router.post('/contacts/add', contactController.addContact);
router.get('/contacts/edit/:id', contactController.renderEdit);
router.post('/contacts/edit/:id', contactController.updateContact);
router.post('/contacts/delete/:id', contactController.deleteContact);

// API Endpoints for AJAX interactions
router.post('/api/contacts/:id/call', contactController.apiRecordCall);

module.exports = router;
