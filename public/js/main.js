/* ----------------------------------------------------
   Call Management System - Client Side Interactive Logic
   ---------------------------------------------------- */

// Keep track of current table states (for AJAX search/sort/pagination)
let currentSearch = '';
let currentSort = 'createdAt';
let currentDirection = 'asc';
let currentPage = 1;
let currentLimit = 10;
let currentExcelFile = '';
let currentFaculty = '';
let deleteModeActive = false;
let autoNextActive = false;
let nextContactToCallId = null;

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Real-Time Clock
  initLiveClock();

  // 2. Initialize AJAX Search/Filter/Pagination/Sorting
  initTableControls();

  // 3. Initialize Contact Actions (Call, Delete, Add Form)
  initContactActions();

  // 4. Initialize Drag & Drop for Excel Import
  initExcelUpload();
});

/**
 * 1. REAL-TIME CLOCK SETUP
 */
function initLiveClock() {
  const timeEl = document.getElementById('header-live-time');
  const dateEl = document.getElementById('header-live-date');
  if (!timeEl || !dateEl) return;

  function update() {
    const now = new Date();
    
    // Time Format: HH:MM:SS AM/PM
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // Handle 0 as 12
    timeEl.textContent = `${String(hours).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;

    // Date Format: Thursday, July 23, 2026
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateEl.textContent = now.toLocaleDateString('en-US', dateOptions);
  }

  update();
  setInterval(update, 1000);
}

/**
 * 2. TABLE DYNAMIC REFRESH ENGINE (AJAX)
 */
function initTableControls() {
  const tableContainer = document.getElementById('table-container');
  if (!tableContainer) return;

  // Read initial states from query parameters or defaults
  const params = new URLSearchParams(window.location.search);
  currentSearch = params.get('search') || '';
  currentSort = params.get('sort') || 'createdAt';
  currentDirection = params.get('direction') || 'asc';
  currentPage = parseInt(params.get('page')) || 1;
  currentLimit = parseInt(params.get('limit')) || 10;
  currentExcelFile = params.get('excelFile') || '';
  currentFaculty = params.get('facultyName') || '';

  // Debounced Live Search Input handler
  const searchInput = document.getElementById('live-search-input');
  if (searchInput) {
    let searchDebounceTimer;
    const clearBtn = document.getElementById('clear-search-btn');

    const checkClearBtn = () => {
      if (searchInput.value.trim().length > 0) {
        clearBtn?.classList.remove('d-none');
      } else {
        clearBtn?.classList.add('d-none');
      }
    };
    checkClearBtn();

    searchInput.addEventListener('input', (e) => {
      checkClearBtn();
      currentSearch = e.target.value.trim();
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        currentPage = 1; // Reset to page 1
        fetchTableData();
      }, 350); // 350ms debounce
    });

    clearBtn?.addEventListener('click', () => {
      searchInput.value = '';
      clearBtn.classList.add('d-none');
      currentSearch = '';
      currentPage = 1;
      fetchTableData();
    });
  }

  // --- EVENT DELEGATION ON DYNAMIC TABLE CONTAINER ---

  // Sort Headers Click Handler
  document.addEventListener('click', (e) => {
    const header = e.target.closest('.sortable');
    if (!header) return;
    
    const sortField = header.dataset.sort;
    if (currentSort === sortField) {
      currentDirection = currentDirection === 'asc' ? 'desc' : 'asc';
    } else {
      currentSort = sortField;
      currentDirection = 'asc';
    }
    currentPage = 1; // Reset page
    fetchTableData();
  });

  // Page Navigation Click Handler
  document.addEventListener('click', (e) => {
    const navBtn = e.target.closest('.page-nav-btn');
    if (!navBtn) return;
    e.preventDefault();
    
    const targetPage = parseInt(navBtn.dataset.page);
    if (!isNaN(targetPage) && targetPage !== currentPage) {
      currentPage = targetPage;
      fetchTableData();
    }
  });

  // Page Size Selector Change Handler
  document.addEventListener('change', (e) => {
    const sizeSelect = e.target.closest('#page-size-selector');
    if (!sizeSelect) return;
    
    currentLimit = parseInt(sizeSelect.value);
    currentPage = 1; // Reset page
    fetchTableData();
  });

  // Excel File Selector Change Handler
  document.addEventListener('change', (e) => {
    const excelSelect = e.target.closest('#excel-filter-selector');
    if (!excelSelect) return;
    
    currentExcelFile = excelSelect.value;
    currentPage = 1; // Reset page
    fetchTableData();
  });

  // Faculty Selector Change Handler
  document.addEventListener('change', (e) => {
    const facultySelect = e.target.closest('#faculty-filter-selector');
    if (!facultySelect) return;
    
    currentFaculty = facultySelect.value;
    currentPage = 1; // Reset page
    fetchTableData();
  });
}

/**
 * Fetch table fragment from server and patch the DOM
 */
async function fetchTableData() {
  const tableContainer = document.getElementById('table-container');
  if (!tableContainer) return;

  // Add opacity loader transition
  tableContainer.style.opacity = '0.55';

  const queryParams = new URLSearchParams({
    search: currentSearch,
    sort: currentSort,
    direction: currentDirection,
    page: currentPage,
    limit: currentLimit,
    excelFile: currentExcelFile,
    facultyName: currentFaculty,
    ajax: 'true'
  });

  try {
    const response = await fetch(`/?${queryParams.toString()}`);
    if (!response.ok) throw new Error('Failed to refresh data table.');

    const data = await response.json();
    if (data.success) {
      // Patch HTML fragment
      tableContainer.innerHTML = data.html;
      
      // Restore delete mode switch state
      const deleteCheckbox = document.getElementById('show-delete-checkbox');
      if (deleteCheckbox) {
        deleteCheckbox.checked = deleteModeActive;
      }
      toggleDeleteButtons(deleteModeActive);
      
      // Restore auto-next switch state
      const autoNextCheckbox = document.getElementById('auto-next-checkbox');
      if (autoNextCheckbox) {
        autoNextCheckbox.checked = autoNextActive;
      }
      
      // Update contact badge counter in header
      const badge = document.getElementById('header-contacts-badge');
      if (badge) badge.textContent = data.totalOverallContacts;

      // Update URL parameters silently for shareable bookmarks
      const cleanUrl = `${window.location.origin}${window.location.pathname}?search=${encodeURIComponent(currentSearch)}&sort=${currentSort}&direction=${currentDirection}&page=${currentPage}&limit=${currentLimit}&excelFile=${encodeURIComponent(currentExcelFile)}&facultyName=${encodeURIComponent(currentFaculty)}`;
      window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
    }
  } catch (error) {
    showToast('Error', error.message || 'An error occurred while loading database content.', 'bi-exclamation-octagon-fill text-danger');
  } finally {
    tableContainer.style.opacity = '1';
  }
}

/**
 * 3. CONTACT ACTIONS (CALL LOG, ADD CONTACT, DELETE)
 */
function initContactActions() {
  let selectedContactIdToDelete = null;
  const deleteModalEl = document.getElementById('deleteContactModal');

  // Toggle Delete Mode checkbox state listener
  document.addEventListener('change', (e) => {
    const deleteCheckbox = e.target.closest('#show-delete-checkbox');
    if (!deleteCheckbox) return;

    deleteModeActive = deleteCheckbox.checked;
    toggleDeleteButtons(deleteModeActive);
  });

  // Toggle Auto-Next Mode checkbox state listener
  document.addEventListener('change', (e) => {
    const autoNextCheckbox = e.target.closest('#auto-next-checkbox');
    if (!autoNextCheckbox) return;

    autoNextActive = autoNextCheckbox.checked;
  });

  // Auto-Dial Next Number when window regains focus (e.g. user returns from phone dialer)
  window.addEventListener('focus', () => {
    if (autoNextActive && nextContactToCallId) {
      const nextId = nextContactToCallId;
      nextContactToCallId = null; // Clear to prevent infinite triggers

      // Show warning/toast notification with action details
      showToast('Auto-Next Dialer', 'Initiating call for the next contact in 2 seconds...', 'bi-telephone-fill text-emerald');

      setTimeout(() => {
        // Find the call button in the DOM and click it
        const nextCallBtn = document.querySelector(`.btn-call[data-id="${nextId}"]`);
        if (nextCallBtn) {
          nextCallBtn.click();
        }
      }, 2000);
    }
  });
  const deleteModal = deleteModalEl ? new bootstrap.Modal(deleteModalEl) : null;

  // --- EVENT DELEGATION FOR ROW BUTTONS ---

  // Call Button Click
  document.addEventListener('click', async (e) => {
    const callBtn = e.target.closest('.btn-call');
    if (!callBtn) return;
    
    const contactId = callBtn.dataset.id;
    const mobile = callBtn.dataset.mobile;
    const originalContent = callBtn.innerHTML;

    // Loading status indicators
    callBtn.disabled = true;
    callBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>`;

    try {
      const response = await fetch(`/api/contacts/${contactId}/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) throw new Error('Failed to log call to server.');
      
      const data = await response.json();
      if (data.success) {
        // Dynamically update this contact row's class to show it is called
        const row = document.getElementById(`contact-row-${contactId}`);
        if (row) {
          row.classList.add('called-row');
          
          // If Auto-Next is active, determine the next contact's ID from the table rows
          if (autoNextActive) {
            const nextRow = row.nextElementSibling;
            if (nextRow) {
              const nextCallBtn = nextRow.querySelector('.btn-call');
              if (nextCallBtn) {
                nextContactToCallId = nextCallBtn.dataset.id;
              } else {
                nextContactToCallId = null;
              }
            } else {
              nextContactToCallId = null;
            }
          }
        }
        
        showToast('Call Initiated', `Opening dialer for contact. Calling: ${mobile}`, 'bi-telephone-fill text-emerald');
        
        // Open system dialer
        window.location.href = `tel:${mobile}`;
      } else {
        throw new Error(data.message || 'Failed to update call metrics.');
      }
    } catch (error) {
      showToast('Call Error', error.message || 'Could not update call logs.', 'bi-exclamation-triangle-fill text-danger');
    } finally {
      callBtn.disabled = false;
      callBtn.innerHTML = originalContent;
    }
  });

  // Delete Action Trigger
  document.addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('.btn-delete');
    if (!deleteBtn) return;

    selectedContactIdToDelete = deleteBtn.dataset.id;
    const contactName = deleteBtn.dataset.name;

    const namePlaceholder = document.getElementById('delete-contact-name-placeholder');
    if (namePlaceholder) namePlaceholder.textContent = contactName;

    deleteModal?.show();
  });

  // Confirm delete button handler
  const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
  confirmDeleteBtn?.addEventListener('click', async () => {
    if (!selectedContactIdToDelete) return;

    confirmDeleteBtn.disabled = true;
    confirmDeleteBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>`;

    try {
      const response = await fetch(`/contacts/delete/${selectedContactIdToDelete}`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        showToast('Success', 'Contact deleted successfully.', 'bi-trash-fill text-emerald');
        deleteModal?.hide();
        fetchTableData(); // Refresh list
      } else {
        throw new Error(data.message || 'Delete operation failed.');
      }
    } catch (error) {
      showToast('Error', error.message || 'Failed to delete contact.', 'bi-exclamation-octagon-fill text-danger');
      deleteModal?.hide();
    } finally {
      confirmDeleteBtn.disabled = false;
      confirmDeleteBtn.textContent = 'Delete';
      selectedContactIdToDelete = null;
    }
  });

  // Delete All Action Trigger
  document.addEventListener('click', (e) => {
    const deleteAllBtn = e.target.closest('#delete-all-btn');
    if (!deleteAllBtn) return;

    const promptTextEl = document.getElementById('delete-all-prompt-text');
    if (promptTextEl) {
      if (!currentExcelFile) {
        promptTextEl.innerHTML = 'Are you sure you want to permanently delete <strong>all contacts</strong> from the database?';
      } else if (currentExcelFile === 'Manually Added') {
        promptTextEl.innerHTML = 'Are you sure you want to permanently delete all <strong>manually added</strong> contacts?';
      } else {
        promptTextEl.innerHTML = `Are you sure you want to permanently delete all contacts imported from <strong>${currentExcelFile}</strong>?`;
      }
    }

    const deleteAllModal = new bootstrap.Modal(document.getElementById('deleteAllContactsModal'));
    deleteAllModal.show();
  });

  // Confirm delete all button handler
  const confirmDeleteAllBtn = document.getElementById('confirm-delete-all-btn');
  confirmDeleteAllBtn?.addEventListener('click', async () => {
    confirmDeleteAllBtn.disabled = true;
    const originalContent = confirmDeleteAllBtn.innerHTML;
    confirmDeleteAllBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>`;

    try {
      const response = await fetch('/contacts/delete-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ excelFile: currentExcelFile })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        showToast('Success', data.message || 'Contacts deleted successfully.', 'bi-trash-fill text-emerald');
        const deleteAllModalEl = document.getElementById('deleteAllContactsModal');
        const modalInstance = bootstrap.Modal.getInstance(deleteAllModalEl);
        modalInstance?.hide();
        
        // Reset current excel filter if we cleared that specific file
        if (currentExcelFile) {
          currentExcelFile = '';
        }
        currentPage = 1;
        fetchTableData(); // Refresh list
      } else {
        throw new Error(data.message || 'Delete operation failed.');
      }
    } catch (error) {
      showToast('Error', error.message || 'Failed to delete contacts.', 'bi-exclamation-octagon-fill text-danger');
      const deleteAllModalEl = document.getElementById('deleteAllContactsModal');
      const modalInstance = bootstrap.Modal.getInstance(deleteAllModalEl);
      modalInstance?.hide();
    } finally {
      confirmDeleteAllBtn.disabled = false;
      confirmDeleteAllBtn.innerHTML = originalContent;
    }
  });

  // Manual Add Form Submission (AJAX)
  const addForm = document.getElementById('add-contact-form');
  addForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Client check validation
    if (!addForm.checkValidity()) {
      addForm.classList.add('was-validated');
      return;
    }

    const nameInput = document.getElementById('add-name');
    const mobileInput = document.getElementById('add-mobile');
    const companyInput = document.getElementById('add-company');
    const cityInput = document.getElementById('add-city');
    const facultyInput = document.getElementById('add-faculty');
    const remarkInput = document.getElementById('add-remark');
    const errorBlock = document.getElementById('add-contact-error');
    const errorMsg = document.getElementById('add-contact-error-msg');
    const submitBtn = addForm.querySelector('button[type="submit"]');
    const spinner = document.getElementById('add-contact-spinner');

    // Reset error alerts
    errorBlock.classList.add('d-none');

    // Button loading
    if (submitBtn) submitBtn.disabled = true;
    spinner?.classList.remove('d-none');

    try {
      const payload = {
        name: nameInput.value,
        mobile: mobileInput.value,
        company: companyInput.value,
        city: cityInput.value,
        facultyName: facultyInput.value,
        remark: remarkInput.value
      };

      const response = await fetch('/contacts/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showToast('Success', 'New contact added successfully.', 'bi-person-check-fill text-emerald');
        
        // Hide Modal
        const modalInstance = bootstrap.Modal.getInstance(document.getElementById('addContactModal'));
        modalInstance?.hide();

        // Clear Form
        addForm.reset();
        addForm.classList.remove('was-validated');

        // Refresh dynamic list
        fetchTableData();
      } else {
        throw new Error(data.message || 'Validation or database error.');
      }
    } catch (error) {
      if (errorBlock && errorMsg) {
        errorMsg.textContent = error.message;
        errorBlock.classList.remove('d-none');
      }
    } finally {
      if (submitBtn) submitBtn.disabled = false;
      spinner?.classList.add('d-none');
    }
  });
}

/**
 * 4. EXCEL IMPORT DRAG AND DROP HANDLERS
 */
function initExcelUpload() {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('excel-file-input');
  const detailsContainer = document.getElementById('selected-file-details');
  const fileNameText = document.getElementById('selected-file-name');
  const fileSizeText = document.getElementById('selected-file-size');
  const removeBtn = document.getElementById('remove-file-btn');
  const submitBtn = document.getElementById('submit-upload-btn');
  const uploadForm = document.getElementById('excel-upload-form');

  if (!dropZone || !fileInput) return;

  const showFile = (file) => {
    if (!file) return;

    // Check extension
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
      alert('Only .xlsx and .xls Excel workbooks are supported.');
      resetFile();
      return;
    }

    fileNameText.textContent = file.name;
    // Format size
    const sizeKB = (file.size / 1024).toFixed(1);
    fileSizeText.textContent = `${sizeKB} KB`;

    detailsContainer.classList.remove('d-none');
    detailsContainer.classList.add('d-flex');
    dropZone.classList.add('d-none');

    if (submitBtn) submitBtn.disabled = false;
  };

  const resetFile = () => {
    fileInput.value = '';
    detailsContainer.classList.add('d-none');
    detailsContainer.classList.remove('d-flex');
    dropZone.classList.remove('d-none');
    if (submitBtn) submitBtn.disabled = true;
  };

  // Browse trigger button
  dropZone.addEventListener('click', (e) => {
    if (e.target.closest('.btn-browse') || e.target === dropZone || dropZone.contains(e.target)) {
      fileInput.click();
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      showFile(fileInput.files[0]);
    }
  });

  // Drag over states
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('dragover');
    }, false);
  });

  // Drop file handler
  dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      fileInput.files = files; // Sync input
      showFile(files[0]);
    }
  });

  removeBtn?.addEventListener('click', resetFile);

  // Form Submit visual loading
  uploadForm?.addEventListener('submit', () => {
    const progressContainer = document.getElementById('upload-progress-container');
    const progressBar = document.getElementById('upload-progress-bar');
    const progressText = document.getElementById('progress-status-text');
    const progressPercent = document.getElementById('progress-percent');
    
    if (submitBtn) submitBtn.disabled = true;
    if (progressContainer) progressContainer.classList.remove('d-none');
    
    // Smooth progress simulation
    let pct = 0;
    const interval = setInterval(() => {
      pct += Math.floor(Math.random() * 12) + 6;
      if (pct >= 95) {
        pct = 95;
        clearInterval(interval);
        if (progressText) progressText.textContent = "Processing contacts on server...";
      }
      if (progressBar) progressBar.style.width = pct + '%';
      if (progressPercent) progressPercent.textContent = pct + '%';
    }, 90);
  });
}

/**
 * UTILITY: SHOW BOOTSTRAP TOAST
 */
function showToast(title, message, iconClass = 'bi-info-circle-fill text-emerald') {
  const toastEl = document.getElementById('statusToast');
  if (!toastEl) return;

  const titleEl = document.getElementById('toast-title');
  const bodyEl = document.getElementById('toast-body-message');
  const iconEl = document.getElementById('toast-icon');

  if (titleEl) titleEl.textContent = title;
  if (bodyEl) bodyEl.textContent = message;
  
  if (iconEl) {
    iconEl.className = `bi ${iconClass} me-2`;
  }

  const toast = new bootstrap.Toast(toastEl);
  toast.show();
}

/**
 * Toggle visibility of all delete buttons based on active mode state
 */
function toggleDeleteButtons(show) {
  const deleteButtons = document.querySelectorAll('.btn-delete');
  deleteButtons.forEach(btn => {
    if (show) {
      btn.classList.remove('d-none');
    } else {
      btn.classList.add('d-none');
    }
  });
}
