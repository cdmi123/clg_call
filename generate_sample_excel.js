const ExcelJS = require('exceljs');
const path = require('path');

async function createSampleExcel() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Contacts');

  // Add Headers
  worksheet.columns = [
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Mobile Number', key: 'mobile', width: 20 },
    { header: 'Company', key: 'company', width: 25 },
    { header: 'City', key: 'city', width: 20 },
    { header: 'Remark', key: 'remark', width: 35 }
  ];

  // Add rows with mock data
  worksheet.addRows([
    { name: 'John Doe', mobile: '9876543210', company: 'Acme Corp', city: 'New York', remark: 'Callback tomorrow morning' },
    { name: 'Jane Smith', mobile: '9876543211', company: 'Stark Industries', city: 'Los Angeles', remark: 'Wants to review pricing plan' },
    { name: 'Rahul Kumar', mobile: '9876543212', company: 'Tata Consultancy', city: 'Mumbai', remark: 'High priority customer' },
    { name: 'Alice Johnson', mobile: '9876543213', company: 'Google', city: 'Mountain View', remark: 'Send information packet' },
    { name: 'Bob Brown', mobile: '9876543214', company: 'Microsoft', city: 'Redmond', remark: 'Follow up next week' },
    { name: 'Charlie Green', mobile: '9876543215', company: 'Amazon', city: 'Seattle', remark: 'Interested in demo session' },
    { name: 'Diana Prince', mobile: '9876543216', company: 'Wayne Enterprises', city: 'Gotham', remark: 'Call only on weekends' },
    { name: 'Bruce Wayne', mobile: '9876543217', company: 'Wayne Enterprises', city: 'Gotham', remark: 'Busy during daytime' },
    { name: 'Clark Kent', mobile: '9876543218', company: 'Daily Planet', city: 'Metropolis', remark: 'Wants callback in evening' },
    { name: 'Peter Parker', mobile: '9876543219', company: 'Daily Bugle', city: 'Queens', remark: 'Send brochure by mail' },
    // Duplicate mobile test case (Peter Parker duplicate)
    { name: 'Peter Duplicate Parker', mobile: '9876543219', company: 'Daily Bugle', city: 'Queens', remark: 'This is a duplicate row, should be ignored' },
    // Missing mobile test case (invalid)
    { name: 'Invalid Row No Mobile', mobile: '', company: 'No Mob Corp', city: 'Lost City', remark: 'Should be ignored due to missing mobile number' }
  ]);

  // Bold Headers formatting
  worksheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true };
  });

  const outputPath = path.join(__dirname, 'sample.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log(`Successfully generated sample Excel file at: ${outputPath}`);
}

createSampleExcel().catch(err => {
  console.error('Error generating Excel file:', err);
});
