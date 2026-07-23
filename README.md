# Call Management System (Node.js + MongoDB + EJS)

A lightweight, modern, and high-performance **Call Management System** designed for speed and ease of use. It features a responsive dark-slate dashboard layout with dynamic contact management, Excel spreadsheet importing, and call tracking metrics without page reloads.

---

## Technical Stack
* **Backend**: Node.js & Express.js (Model-View-Controller architecture)
* **Database**: MongoDB & Mongoose
* **Template Engine**: EJS (Embedded JavaScript)
* **UI styling**: Bootstrap 5 + Bootstrap Icons + Custom CSS
* **File Parsing**: ExcelJS & Multer
* **Security & Optimization**: Helmet, CORS, Compression

---

## Directory Structure
```text
project/
├── controllers/
│   └── contactController.js      # Business logic (EJS pages, Excel parser, Call logs API)
├── models/
│   └── Contact.js                # Mongoose Database Schema for Contact Records
├── routes/
│   └── contactRoutes.js          # Route paths & Multer file upload filters
├── public/
│   ├── css/
│   │   └── style.css             # Dark theme styles, glassmorphism, animations
│   ├── js/
│   │   └── main.js              # Live clocks, AJAX debounced searching, dynamic lists, calling hooks
│   └── images/
├── views/
│   ├── partials/
│   │   ├── header.ejs            # Sticky header with clock, badge, and live search
│   │   └── contacts_table.ejs    # Table partial loaded dynamically via AJAX
│   ├── dashboard.ejs             # Contact Directory primary view & forms modals
│   ├── upload.ejs                # Drag-and-drop Excel file importer with summary metrics
│   ├── edit.ejs                  # Contact detail modification form
│   └── error.ejs                 # Simple error page layout
├── uploads/                      # Temporary storage for file uploads (created automatically)
├── .env.example                  # Environment configuration template
├── .env                          # Current runtime environment variables
├── generate_sample_excel.js      # Utility script generating sample testing spreadsheet
├── sample.xlsx                   # Mock dataset spreadsheet with edge-cases
├── verify_app.js                 # Verification script testing database queries
├── server.js                     # Main application bootstrap and startup script
└── package.json                  # Dependencies manifest
```

---

## Installation & Setup

### Prerequisites
* **Node.js** (v18 or higher recommended)
* **MongoDB** (Ensure the service is running locally on port `27017`)

### 1. Extract and Install Dependencies
Navigate into the project root directory and run:
```bash
npm install
```

### 2. Configure Environment variables
Create a `.env` file from the example template:
```bash
cp .env.example .env
```
By default, the `.env` settings connect to your local MongoDB service:
```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/call-management
```

### 3. Generate Mock Test Data
Run the following script to generate a standard testing Excel spreadsheet (`sample.xlsx`) in the root directory:
```bash
node generate_sample_excel.js
```
*Note: This creates 10 mock records, 1 duplicate row, and 1 invalid row (missing mobile) to test validation features.*

### 4. Execute Programmatic Database Diagnostic
Ensure your local MongoDB service is running, and test the schema validations:
```bash
node verify_app.js
```

### 5. Launch the Server
* To start in standard production mode:
  ```bash
  npm start
  ```
* To start in development mode (using nodemon automatic reloader):
  ```bash
  npm run dev
  ```

---

## Application Usage Guide

### 1. Dashboard (Contact List)
Open [http://localhost:3000](http://localhost:3000) in your browser:
* **Dynamic Search**: Type in the top search bar. The contact table updates instantly without reloading the page.
* **Pagination & Row Sizes**: Swap between showing 10, 25, 50, or 100 entries per page.
* **Column Sorting**: Click any headers (Name, Mobile, Company, City) to toggle sorting directions.
* **Add Contact Modal**: Click "+ Add Contact" on the top right to open a form to manually add a record.
* **Call Button 📞**: Clicking the Call button performs an AJAX call to increment the contact's call log count and timestamp, dynamically updates the row's call-count badge and last call details, and launches your device's dialer (`tel:<number>`).
* **Delete Button 🗑️**: Prompts a confirmation modal to permanently delete the contact from the database.

### 2. Import Excel
Click **Upload Excel** in the navigation bar:
* **Drag-and-Drop / Browse**: Drag your `sample.xlsx` sheet into the dashed box or click browse to locate it.
* **Progress Bar**: Click **Import Contacts**. A loading progress bar runs while the server processes the file.
* **Import Summary**: Displays rows processed, successful additions, ignored duplicates, and skipped rows.
* **Auto-Redirect**: Automatically redirects back to the dashboard after 5 seconds.
