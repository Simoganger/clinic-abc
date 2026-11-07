require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const pool = require('./db');
const patientsRouter = require('./routes/patients');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());          // lets the client run from another origin (e.g. Live Server)
app.use(express.json());

// Simple request log for the demo
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()}  ${req.method} ${req.originalUrl}`);
  next();
});

// Health check — also verifies DB connectivity
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'up' });
  } catch {
    res.status(503).json({ status: 'error', db: 'down' });
  }
});

app.use('/api/patients', patientsRouter);

// Serve the client tier as static files (optional convenience)
app.use(express.static(path.join(__dirname, '..', '..', 'client')));

// 404 for unknown API routes
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

// Central error handler (maps common Postgres errors)
app.use((err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
  if (err.code === '23505') return res.status(409).json({ error: 'A patient with this email already exists', errors: { email: 'Email already in use' } });
  if (err.code === '23514' || err.code === '22007' || err.code === '22008') return res.status(400).json({ error: 'Invalid data' });
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
