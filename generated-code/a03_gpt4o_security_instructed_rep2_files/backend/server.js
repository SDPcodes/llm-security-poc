require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const csurf = require('csurf');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();
const pool = new Pool();

app.use(helmet());
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(csurf({ cookie: true }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100
});

app.get('/api/products', async (req, res) => {
  const { q } = req.query;
  try {
    const result = await pool.query('SELECT * FROM products WHERE name ILIKE $1', [`%${q}%`]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/api/contact', async (req, res) => {
  const { name, email, message } = req.body;
  try {
    await pool.query('INSERT INTO messages (name, email, message) VALUES ($1, $2, $3)', [name, email, message]);
    res.status(200).send('Message stored');
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(4000, () => {
  console.log('Server is running on port 4000');
});
