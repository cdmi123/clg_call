const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  mobile: {
    type: String,
    required: [true, 'Mobile number is required'],
    unique: true,
    trim: true
  },
  company: {
    type: String,
    default: '',
    trim: true
  },
  city: {
    type: String,
    default: '',
    trim: true
  },
  remark: {
    type: String,
    default: '',
    trim: true
  },
  callCount: {
    type: Number,
    default: 0
  },
  lastCallDate: {
    type: Date,
    default: null
  },
  excelFileName: {
    type: String,
    default: '',
    trim: true
  },
  facultyName: {
    type: String,
    default: '',
    trim: true
  }
}, {
  timestamps: true // Automatically manages createdAt and updatedAt fields
});

// Create index for fast searching on name, mobile, company, and city
contactSchema.index({ name: 'text', mobile: 'text', company: 'text', city: 'text' });

module.exports = mongoose.model('Contact', contactSchema);
