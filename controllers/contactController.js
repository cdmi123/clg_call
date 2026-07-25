const Contact = require('../models/Contact');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

// Helper to extract clean cell value from Excel cell object
const getCellValue = (cell) => {
  if (!cell || cell.value === null || cell.value === undefined) return '';
  if (typeof cell.value === 'object') {
    if (cell.value.text) return cell.value.text.trim();
    if (cell.value.result !== undefined && cell.value.result !== null) return cell.value.result.toString().trim();
    return JSON.stringify(cell.value);
  }
  return cell.value.toString().trim();
};

/**
 * Render/Fetch contacts for the Dashboard page
 */
exports.renderDashboard = async (req, res, next) => {
  try {
    const search = req.query.search || '';
    const sort = req.query.sort || 'createdAt';
    const direction = req.query.direction || 'asc';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Filter build
    let query = {};
    const conditions = [];

    // Search filter
    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      conditions.push({
        $or: [
          { name: searchRegex },
          { mobile: searchRegex },
          { company: searchRegex },
          { city: searchRegex }
        ]
      });
    }

    // Excel source filter
    const excelFile = req.query.excelFile || '';
    if (excelFile.trim()) {
      if (excelFile === 'Manually Added') {
        conditions.push({
          $or: [
            { excelFileName: 'Manually Added' },
            { excelFileName: '' },
            { excelFileName: { $exists: false } },
            { excelFileName: null }
          ]
        });
      } else {
        conditions.push({ excelFileName: excelFile.trim() });
      }
    }

    // Faculty filter
    const facultyName = req.query.facultyName || '';
    if (facultyName.trim()) {
      if (facultyName === 'Unassigned') {
        conditions.push({
          $or: [
            { facultyName: '' },
            { facultyName: { $exists: false } },
            { facultyName: null }
          ]
        });
      } else {
        conditions.push({ facultyName: facultyName.trim() });
      }
    }

    if (conditions.length > 0) {
      query = { $and: conditions };
    }

    // Sort build
    const sortDir = direction === 'desc' ? -1 : 1;
    const sortObj = { [sort]: sortDir };

    // Fetch unique excel file names for filtering
    const allFiles = await Contact.distinct('excelFileName');
    const excelFiles = allFiles.filter(f => f && f !== 'Manually Added' && f.trim() !== '').sort();

    // Queries
    const totalContacts = await Contact.countDocuments(query);
    const totalOverallContacts = await Contact.countDocuments();
    
    const contacts = await Contact.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalContacts / limit) || 1;

    // AJAX requests render the table body & pagination partials as a JSON payload
    if (req.query.ajax === 'true') {
      return res.render('partials/contacts_table', { 
        contacts, 
        page, 
        limit, 
        totalContacts, 
        totalPages,
        sort,
        direction,
        search,
        excelFiles,
        selectedExcelFile: excelFile,
        selectedFaculty: facultyName
      }, (err, html) => {
        if (err) return next(err);
        res.json({
          success: true,
          html,
          totalContacts,
          totalOverallContacts,
          totalPages,
          page
        });
      });
    }

    // Standard page load
    res.render('dashboard', {
      contacts,
      page,
      limit,
      totalContacts,
      totalOverallContacts,
      totalPages,
      sort,
      direction,
      search,
      excelFiles,
      selectedExcelFile: excelFile,
      selectedFaculty: facultyName,
      title: 'Dashboard | Call Management System'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Render Upload page
 */
exports.renderUpload = async (req, res, next) => {
  try {
    const totalOverallContacts = await Contact.countDocuments();
    res.render('upload', {
      title: 'Import Contacts | Call Management System',
      totalOverallContacts,
      summary: null,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle Excel import upload
 */
exports.uploadExcel = async (req, res, next) => {
  const file = req.file;
  const facultyName = req.body.facultyName || '';
  if (!file) {
    return res.render('upload', {
      title: 'Import Contacts | Call Management System',
      totalOverallContacts: await Contact.countDocuments(),
      summary: null,
      error: 'Please select a valid Excel file (.xls, .xlsx) to upload.'
    });
  }

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(file.path);
    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      throw new Error('Excel sheet is empty.');
    }

    // Extract headers (Row 1)
    const headers = [];
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber] = cell.value ? cell.value.toString().trim() : '';
    });

    // Detect column indexes (1-based)
    let nameCol = -1;
    let mobileCol = -1;
    let companyCol = -1;
    let cityCol = -1;
    let remarkCol = -1;

    for (let i = 1; i <= headers.length; i++) {
      const h = headers[i] ? headers[i].toLowerCase() : '';
      if (h.includes('name')) nameCol = i;
      else if (h.includes('mobile') || h.includes('phone') || h.includes('number')) mobileCol = i;
      else if (h.includes('company')) companyCol = i;
      else if (h.includes('city')) cityCol = i;
      else if (h.includes('remark') || h.includes('note')) remarkCol = i;
    }

    // Required columns validation
    if (nameCol === -1 || mobileCol === -1) {
      throw new Error('Required columns "Name" and "Mobile Number" were not found in the uploaded file.');
    }

    const contactsToInsert = [];
    const duplicatesInUpload = [];
    const invalidRows = [];
    const seenMobilesInFile = new Set();

    // Iterate through all rows starting from row 2
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const name = getCellValue(row.getCell(nameCol));
      let mobile = getCellValue(row.getCell(mobileCol));
      
      // Standardize mobile number (remove spaces, brackets, dashes)
      if (mobile) {
        mobile = mobile.toString().replace(/[\s\-\(\)\+]/g, '').trim();
      }

      const company = companyCol !== -1 ? getCellValue(row.getCell(companyCol)) : '';
      const city = cityCol !== -1 ? getCellValue(row.getCell(cityCol)) : '';
      const remark = remarkCol !== -1 ? getCellValue(row.getCell(remarkCol)) : '';

      // Skip fully empty rows
      if (!name && !mobile && !company && !city && !remark) {
        return;
      }

      if (!name || !mobile) {
        invalidRows.push({ row: rowNumber, name, mobile, reason: 'Name and Mobile Number are required.' });
        return;
      }

      // Check duplicates in the uploaded sheet
      if (seenMobilesInFile.has(mobile)) {
        duplicatesInUpload.push({ row: rowNumber, name, mobile, reason: 'Duplicate mobile number in Excel sheet.' });
        return;
      }
      seenMobilesInFile.add(mobile);

      contactsToInsert.push({ name, mobile, company, city, remark, excelFileName: file.originalname, facultyName });
    });

    // Check duplicates against existing database records
    const mobilesToImport = contactsToInsert.map(c => c.mobile);
    const existingContacts = await Contact.find({ mobile: { $in: mobilesToImport } });
    const existingMobiles = new Set(existingContacts.map(c => c.mobile));

    const finalContactsToInsert = [];
    let dbDuplicatesCount = 0;

    for (const c of contactsToInsert) {
      if (existingMobiles.has(c.mobile)) {
        dbDuplicatesCount++;
      } else {
        finalContactsToInsert.push(c);
      }
    }

    // Save to Database
    let importedCount = 0;
    if (finalContactsToInsert.length > 0) {
      const result = await Contact.insertMany(finalContactsToInsert, { ordered: false });
      importedCount = result.length;
    }

    // Clean up file
    fs.unlinkSync(file.path);

    // Render summary
    const totalOverallContacts = await Contact.countDocuments();
    const summary = {
      totalRowsProcessed: worksheet.rowCount - 1,
      importedCount,
      skippedDuplicates: duplicatesInUpload.length + dbDuplicatesCount,
      invalidRowsCount: invalidRows.length
    };

    res.render('upload', {
      title: 'Import Summary | Call Management System',
      totalOverallContacts,
      summary,
      error: null
    });

  } catch (error) {
    // Clean up file on error
    if (file && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    
    const totalOverallContacts = await Contact.countDocuments();
    res.render('upload', {
      title: 'Import Contacts | Call Management System',
      totalOverallContacts,
      summary: null,
      error: error.message || 'An error occurred while importing the Excel file.'
    });
  }
};

/**
 * Add a contact manually
 */
exports.addContact = async (req, res) => {
  try {
    const { name, mobile, company, city, remark, facultyName } = req.body;

    if (!name || !mobile) {
      return res.status(400).json({ success: false, message: 'Name and Mobile Number are required.' });
    }

    // Clean mobile number
    const cleanMobile = mobile.replace(/[\s\-\(\)\+]/g, '').trim();

    // Check unique mobile
    const existing = await Contact.findOne({ mobile: cleanMobile });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Mobile number already exists in database.' });
    }

    const newContact = new Contact({
      name: name.trim(),
      mobile: cleanMobile,
      company: company ? company.trim() : '',
      city: city ? city.trim() : '',
      remark: remark ? remark.trim() : '',
      excelFileName: 'Manually Added',
      facultyName: facultyName ? facultyName.trim() : ''
    });

    await newContact.save();
    return res.status(200).json({ success: true, message: 'Contact added successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to add contact.' });
  }
};

/**
 * Render Edit view
 */
exports.renderEdit = async (req, res, next) => {
  try {
    const contact = await Contact.findById(req.params.id);
    if (!contact) {
      return res.status(404).render('error', { message: 'Contact not found' });
    }
    const totalOverallContacts = await Contact.countDocuments();
    res.render('edit', {
      title: 'Edit Contact | Call Management System',
      contact,
      totalOverallContacts
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update contact
 */
exports.updateContact = async (req, res, next) => {
  try {
    const { name, mobile, company, city, remark, facultyName } = req.body;
    const contactId = req.params.id;

    if (!name || !mobile) {
      throw new Error('Name and Mobile Number are required.');
    }

    const cleanMobile = mobile.replace(/[\s\-\(\)\+]/g, '').trim();

    // Check for another contact with the same mobile number
    const duplicate = await Contact.findOne({ mobile: cleanMobile, _id: { $ne: contactId } });
    if (duplicate) {
      throw new Error('Another contact already exists with this mobile number.');
    }

    await Contact.findByIdAndUpdate(contactId, {
      name: name.trim(),
      mobile: cleanMobile,
      company: company ? company.trim() : '',
      city: city ? city.trim() : '',
      remark: remark ? remark.trim() : '',
      facultyName: facultyName ? facultyName.trim() : ''
    });

    res.redirect('/');
  } catch (error) {
    try {
      const contact = await Contact.findById(req.params.id);
      const totalOverallContacts = await Contact.countDocuments();
      res.render('edit', {
        title: 'Edit Contact | Call Management System',
        contact,
        totalOverallContacts,
        error: error.message
      });
    } catch (dbErr) {
      next(dbErr);
    }
  }
};

/**
 * Delete a contact
 */
exports.deleteContact = async (req, res) => {
  try {
    await Contact.findByIdAndDelete(req.params.id);
    if (req.headers['accept']?.includes('application/json')) {
      return res.json({ success: true, message: 'Contact deleted successfully.' });
    }
    res.redirect('/');
  } catch (error) {
    if (req.headers['accept']?.includes('application/json')) {
      return res.status(500).json({ success: false, message: error.message });
    }
    res.redirect('/');
  }
};

/**
 * Delete all contacts or contacts matching an excel file filter
 */
exports.deleteAllContacts = async (req, res) => {
  try {
    const { excelFile } = req.body;
    let query = {};

    if (excelFile && excelFile.trim()) {
      if (excelFile === 'Manually Added') {
        query = {
          $or: [
            { excelFileName: 'Manually Added' },
            { excelFileName: '' },
            { excelFileName: { $exists: false } },
            { excelFileName: null }
          ]
        };
      } else {
        query = { excelFileName: excelFile.trim() };
      }
    }

    const result = await Contact.deleteMany(query);
    return res.json({ 
      success: true, 
      message: `Successfully deleted ${result.deletedCount} contacts.` 
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to delete contacts.' 
    });
  }
};

/**
 * Record a call (AJAX Endpoint)
 */
exports.apiRecordCall = async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);
    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found.' });
    }

    contact.callCount += 1;
    contact.lastCallDate = new Date();
    await contact.save();

    res.json({
      success: true,
      contact: {
        id: contact._id,
        callCount: contact.callCount,
        lastCallDate: contact.lastCallDate.toLocaleString()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to update call records.' });
  }
};
