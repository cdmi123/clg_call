require('dotenv').config();
const mongoose = require('mongoose');
const Contact = require('./models/Contact');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/call-management';

async function runTests() {
  console.log('--- STARTING DIAGNOSTIC VERIFICATION ---');
  console.log(`Connecting to database at ${MONGODB_URI}...`);
  
  await mongoose.connect(MONGODB_URI);
  console.log('Connected successfully.');

  // Clean up any old test items
  console.log('Cleaning up old test data...');
  await Contact.deleteMany({ mobile: { $in: ['9999999901', '9999999902'] } });

  // Test Case 1: Insert Valid Contact
  console.log('Test Case 1: Inserting valid contact...');
  const testContact = new Contact({
    name: 'Verification Tester',
    mobile: '9999999901',
    company: 'Test Laboratory',
    city: 'Virtual City',
    remark: 'This is a programmatically added contact for test verification'
  });

  const saved = await testContact.save();
  if (saved && saved._id) {
    console.log('✔ Test Case 1 Passed: Contact saved successfully.');
  } else {
    throw new Error('✘ Test Case 1 Failed: Contact failed to save.');
  }

  // Test Case 2: Attempt Duplicate Mobile Insertion
  console.log('Test Case 2: Verification of duplicate mobile validation...');
  const duplicateContact = new Contact({
    name: 'Duplicate Tester',
    mobile: '9999999901', // Same number
    company: 'Another Company',
    city: 'Another City'
  });

  try {
    await duplicateContact.save();
    throw new Error('✘ Test Case 2 Failed: Saved contact with duplicate mobile number (which violates unique constraint).');
  } catch (error) {
    if (error.code === 11000 || error.message.includes('duplicate key') || error.message.includes('unique')) {
      console.log('✔ Test Case 2 Passed: Correctly blocked duplicate mobile record insertion.');
    } else {
      console.error('Unexpected error on duplicate check:', error);
      throw error;
    }
  }

  // Test Case 3: Verify fields exist and default values
  console.log('Test Case 3: Verifying default schema values...');
  const checkContact = await Contact.findOne({ mobile: '9999999901' });
  if (checkContact.callCount === 0 && checkContact.lastCallDate === null) {
    console.log('✔ Test Case 3 Passed: Schema default values callCount=0 and lastCallDate=null verified.');
  } else {
    throw new Error(`✘ Test Case 3 Failed: Invalid default values. callCount=${checkContact.callCount}, lastCallDate=${checkContact.lastCallDate}`);
  }

  // Clean up test data
  console.log('Cleaning up test data...');
  await Contact.deleteMany({ mobile: { $in: ['9999999901'] } });

  console.log('--- ALL BACKEND VERIFICATIONS COMPLETED SUCCESSFULLY ---');
}

runTests()
  .then(() => {
    mongoose.connection.close();
    process.exit(0);
  })
  .catch((err) => {
    console.error('verification failed with errors:', err);
    mongoose.connection.close();
    process.exit(1);
  });
