/**
 * Presentation layer: DOM manipulation + event handling.
 * Rows are built with createElement/textContent (no innerHTML with user data → no XSS).
 */

// ---------- DOM references ----------
const tableBody      = document.getElementById('patientsTableBody');
const emptyState     = document.getElementById('emptyState');
const loadingState   = document.getElementById('loadingState');
const patientCount   = document.getElementById('patientCount');
const searchInput    = document.getElementById('searchInput');
const apiStatus      = document.getElementById('apiStatus');

const patientModalEl = document.getElementById('patientModal');
const patientModal   = new bootstrap.Modal(patientModalEl);
const patientForm    = document.getElementById('patientForm');
const modalTitle     = document.getElementById('patientModalTitle');
const formAlert      = document.getElementById('formAlert');
const saveBtn        = document.getElementById('saveBtn');
const saveSpinner    = document.getElementById('saveSpinner');

const deleteModal    = new bootstrap.Modal(document.getElementById('deleteModal'));
const deleteName     = document.getElementById('deletePatientName');
const confirmDelete  = document.getElementById('confirmDeleteBtn');

const FIELDS = ['first_name', 'last_name', 'date_of_birth', 'gender', 'blood_type', 'email', 'phone'];

let patients = [];         // current list shown in the table
let pendingDeleteId = null;

// ---------- Helpers ----------
function el(tag, { className, text, attrs = {} } = {}, children = []) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  children.forEach((c) => c && node.append(c));
  return node;
}

function calcAge(dob) {
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

function formatDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function showToast(message, variant = 'success') {
  const icon = variant === 'success' ? 'bi-check-circle-fill' : 'bi-x-circle-fill';
  const toast = el('div', { className: `toast align-items-center text-bg-${variant} border-0`, attrs: { role: 'alert' } }, [
    el('div', { className: 'd-flex' }, [
      el('div', { className: 'toast-body' }, [el('i', { className: `bi ${icon} me-2` }), document.createTextNode(message)]),
      el('button', { className: 'btn-close btn-close-white me-2 m-auto', attrs: { type: 'button', 'data-bs-dismiss': 'toast' } }),
    ]),
  ]);
  document.getElementById('toastContainer').append(toast);
  const t = new bootstrap.Toast(toast, { delay: 3000 });
  toast.addEventListener('hidden.bs.toast', () => toast.remove());
  t.show();
}

// ---------- Rendering ----------
function buildRow(p) {
  const initials = `${p.first_name[0] || ''}${p.last_name[0] || ''}`.toUpperCase();

  const nameCell = el('td', {}, [
    el('div', { className: 'd-flex align-items-center gap-2' }, [
      el('span', { className: `avatar ${p.gender}`, text: initials }),
      el('div', {}, [
        el('div', { className: 'fw-semibold', text: `${p.first_name} ${p.last_name}` }),
      ]),
    ]),
  ]);

  const contactCell = el('td', { className: 'small' }, [
    p.email ? el('div', {}, [el('i', { className: 'bi bi-envelope me-1 text-secondary' }), document.createTextNode(p.email)]) : null,
    p.phone ? el('div', {}, [el('i', { className: 'bi bi-telephone me-1 text-secondary' }), document.createTextNode(p.phone)]) : null,
    !p.email && !p.phone ? el('span', { className: 'text-secondary', text: '—' }) : null,
  ]);

  const editBtn = el('button', { className: 'btn btn-sm btn-outline-primary', attrs: { title: 'Edit', 'data-action': 'edit', 'data-id': p.id } },
    [el('i', { className: 'bi bi-pencil' })]);
  const delBtn = el('button', { className: 'btn btn-sm btn-outline-danger', attrs: { title: 'Delete', 'data-action': 'delete', 'data-id': p.id } },
    [el('i', { className: 'bi bi-trash' })]);

  return el('tr', { attrs: { 'data-id': p.id } }, [
    el('td', { className: 'text-secondary', text: p.id }),
    nameCell,
    el('td', { text: formatDate(p.date_of_birth) }),
    el('td', { text: calcAge(p.date_of_birth) }),
    el('td', { text: capitalize(p.gender) }),
    el('td', {}, [
      p.blood_type
        ? el('span', { className: 'badge text-bg-danger blood-badge', text: p.blood_type })
        : el('span', { className: 'text-secondary', text: '—' }),
    ]),
    contactCell,
    el('td', { className: 'text-end' }, [el('div', { className: 'btn-group' }, [editBtn, delBtn])]),
  ]);
}

function renderTable(highlightId = null) {
  tableBody.replaceChildren(...patients.map(buildRow));
  patientCount.textContent = patients.length;
  emptyState.classList.toggle('d-none', patients.length > 0);

  if (highlightId) {
    const row = tableBody.querySelector(`tr[data-id="${highlightId}"]`);
    row?.classList.add('row-highlight');
    row?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

async function loadPatients(highlightId = null) {
  loadingState.classList.remove('d-none');
  try {
    patients = await PatientApi.list(searchInput.value.trim());
    renderTable(highlightId);
  } catch (err) {
    patients = [];
    renderTable();
    showToast(`Could not load patients: ${err.message}`, 'danger');
  } finally {
    loadingState.classList.add('d-none');
  }
}

// ---------- Form handling ----------
function clearFormErrors() {
  formAlert.classList.add('d-none');
  patientForm.querySelectorAll('.is-invalid').forEach((i) => i.classList.remove('is-invalid'));
}

function showFieldErrors(errors = {}) {
  Object.entries(errors).forEach(([field, msg]) => {
    const input = patientForm.elements[field];
    if (!input) return;
    input.classList.add('is-invalid');
    input.nextElementSibling.textContent = msg;
  });
}

function openCreateModal() {
  patientForm.reset();
  patientForm.elements.id.value = '';
  clearFormErrors();
  modalTitle.textContent = 'New patient';
  patientModal.show();
}

function openEditModal(id) {
  const p = patients.find((x) => x.id === id);
  if (!p) return;
  patientForm.reset();
  clearFormErrors();
  patientForm.elements.id.value = p.id;
  FIELDS.forEach((f) => { patientForm.elements[f].value = p[f] ?? ''; });
  modalTitle.textContent = `Edit ${p.first_name} ${p.last_name}`;
  patientModal.show();
}

function readForm() {
  return Object.fromEntries(FIELDS.map((f) => [f, patientForm.elements[f].value.trim()]));
}

// Client-side validation using the browser's Constraint Validation API
function validateClient() {
  let ok = true;
  const errors = {};
  FIELDS.forEach((f) => {
    const input = patientForm.elements[f];
    if (!input.checkValidity()) {
      ok = false;
      errors[f] = input.validationMessage;
    }
  });
  const dob = patientForm.elements.date_of_birth.value;
  if (dob && new Date(dob) > new Date()) { ok = false; errors.date_of_birth = 'Date of birth cannot be in the future'; }
  showFieldErrors(errors);
  return ok;
}

async function handleSubmit(e) {
  e.preventDefault();
  clearFormErrors();
  if (!validateClient()) return;

  const id = Number(patientForm.elements.id.value) || null;
  const data = readForm();

  saveBtn.disabled = true;
  saveSpinner.classList.remove('d-none');
  try {
    const saved = id ? await PatientApi.update(id, data) : await PatientApi.create(data);
    patientModal.hide();
    showToast(id ? 'Patient updated' : 'Patient created');
    await loadPatients(saved.id);
  } catch (err) {
    formAlert.textContent = err.message;
    formAlert.classList.remove('d-none');
    showFieldErrors(err.errors);
  } finally {
    saveBtn.disabled = false;
    saveSpinner.classList.add('d-none');
  }
}

// ---------- Delete ----------
function openDeleteModal(id) {
  const p = patients.find((x) => x.id === id);
  if (!p) return;
  pendingDeleteId = id;
  deleteName.textContent = `${p.first_name} ${p.last_name}`;
  deleteModal.show();
}

async function handleDelete() {
  if (!pendingDeleteId) return;
  confirmDelete.disabled = true;
  try {
    await PatientApi.remove(pendingDeleteId);
    deleteModal.hide();
    showToast('Patient deleted');
    // Remove the row locally without refetching (pure DOM manipulation)
    patients = patients.filter((p) => p.id !== pendingDeleteId);
    renderTable();
  } catch (err) {
    showToast(`Delete failed: ${err.message}`, 'danger');
  } finally {
    confirmDelete.disabled = false;
    pendingDeleteId = null;
  }
}

// ---------- API status badge ----------
async function checkHealth() {
  try {
    await PatientApi.health();
    apiStatus.className = 'badge rounded-pill text-bg-success';
    apiStatus.textContent = 'API + DB: online';
  } catch {
    apiStatus.className = 'badge rounded-pill text-bg-danger';
    apiStatus.textContent = 'API: offline';
  }
}

// ---------- Event wiring ----------
document.getElementById('newPatientBtn').addEventListener('click', openCreateModal);
patientForm.addEventListener('submit', handleSubmit);
confirmDelete.addEventListener('click', handleDelete);

// Event delegation: one listener for all row buttons
tableBody.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  if (btn.dataset.action === 'edit') openEditModal(id);
  if (btn.dataset.action === 'delete') openDeleteModal(id);
});

// Debounced search
let searchTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadPatients(), 300);
});

// Clear a field's error as soon as the user edits it
patientForm.addEventListener('input', (e) => e.target.classList.remove('is-invalid'));

// ---------- Init ----------
checkHealth();
loadPatients();
