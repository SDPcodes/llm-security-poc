require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const csurf = require('csurf');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const { body, validationResult, query } = require('express-validator');

const app = express();
const pool = new Pool();

app.use(helmet());
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(csurf({ cookie: true }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.'
});

app.get('/api/products', [
  query('q').isString().trim().isLength({ min: 1 }).escape()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { q } = req.query;
  try {
    const result = await pool.query('SELECT * FROM products WHERE name ILIKE $1', [`%${q}%`]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.post('/api/contact', [
  body('name').isString().trim().isLength({ min: 1 }).escape(),
  body('email').isEmail().normalizeEmail(),
  body('message').isString().trim().isLength({ min: 1 }).escape()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, message } = req.body;
  try {
    await pool.query('INSERT INTO messages (name, email, message) VALUES ($1, $2, $3)', [name, email, message]);
    res.status(200).send('Message received');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
