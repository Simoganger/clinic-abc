const { Pool } = require('pg');

// Connection settings come from PG* env variables (see .env.example)
const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER || 'clinic',
  password: process.env.PGPASSWORD || 'clinic',
  database: process.env.PGDATABASE || 'clinic',
});

// Return DATE columns as 'YYYY-MM-DD' strings instead of JS Date objects
// (avoids timezone shifts when sending dates to the browser)
const { types } = require('pg');
types.setTypeParser(1082, (val) => val);

module.exports = pool;
