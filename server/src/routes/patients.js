const express = require('express');
const pool = require('../db');
const { validatePatient } = require('../validation');

const router = express.Router();

const COLUMNS = `id, first_name, last_name, date_of_birth, gender, blood_type,
                 email, phone, created_at, updated_at`;

// Wraps async handlers so thrown errors reach the error middleware
const asyncHandler = (fn) => (req, res, next) => fn(req, res, next).catch(next);

function parseId(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid patient id' });
    return null;
  }
  return id;
}

// READ all (optional ?q= search on name/email)
router.get('/', asyncHandler(async (req, res) => {
  const q = (req.query.q || '').trim();
  const { rows } = q
    ? await pool.query(
        `SELECT ${COLUMNS} FROM patients
         WHERE first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1
         ORDER BY last_name, first_name`,
        [`%${q}%`]
      )
    : await pool.query(`SELECT ${COLUMNS} FROM patients ORDER BY last_name, first_name`);
  res.json(rows);
}));

// READ one
router.get('/:id', asyncHandler(async (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;
  const { rows } = await pool.query(`SELECT ${COLUMNS} FROM patients WHERE id = $1`, [id]);
  if (!rows.length) return res.status(404).json({ error: 'Patient not found' });
  res.json(rows[0]);
}));

// CREATE
router.post('/', asyncHandler(async (req, res) => {
  const { value: p, errors } = validatePatient(req.body);
  if (Object.keys(errors).length) return res.status(400).json({ error: 'Validation failed', errors });

  const { rows } = await pool.query(
    `INSERT INTO patients (first_name, last_name, date_of_birth, gender, blood_type, email, phone)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${COLUMNS}`,
    [p.first_name, p.last_name, p.date_of_birth, p.gender, p.blood_type, p.email, p.phone]
  );
  res.status(201).location(`/api/patients/${rows[0].id}`).json(rows[0]);
}));

// UPDATE (full replace)
router.put('/:id', asyncHandler(async (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;
  const { value: p, errors } = validatePatient(req.body);
  if (Object.keys(errors).length) return res.status(400).json({ error: 'Validation failed', errors });

  const { rows } = await pool.query(
    `UPDATE patients
     SET first_name = $1, last_name = $2, date_of_birth = $3, gender = $4,
         blood_type = $5, email = $6, phone = $7, updated_at = NOW()
     WHERE id = $8
     RETURNING ${COLUMNS}`,
    [p.first_name, p.last_name, p.date_of_birth, p.gender, p.blood_type, p.email, p.phone, id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Patient not found' });
  res.json(rows[0]);
}));

// DELETE
router.delete('/:id', asyncHandler(async (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;
  const { rowCount } = await pool.query('DELETE FROM patients WHERE id = $1', [id]);
  if (!rowCount) return res.status(404).json({ error: 'Patient not found' });
  res.status(204).end();
}));

module.exports = router;
