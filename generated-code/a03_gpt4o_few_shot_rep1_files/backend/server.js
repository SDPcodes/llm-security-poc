const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const contactLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });

app.get('/api/products', async (req, res) => {
  const { q } = req.query;
  try {
    const result = await pool.query('SELECT * FROM products WHERE name ILIKE $1', [`%${q}%`]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/contact', contactLimiter, async (req, res) => {
  const { name, email, message } = req.body;
  try {
    await pool.query('INSERT INTO messages (name, email, message) VALUES ($1, $2, $3)', [name, email, message]);
    res.status(201).json({ message: 'Message received' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(process.env.PORT || 3001, () => {
  console.log('Server is running');
});
