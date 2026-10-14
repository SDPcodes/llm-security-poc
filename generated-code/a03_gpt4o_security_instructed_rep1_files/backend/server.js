require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const csrf = require('csurf');
const { Pool } = require('pg');
const validator = require('validator');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());

const csrfProtection = csrf({ cookie: true });

const pool = new Pool();

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // Limit each IP to 100 requests per windowMs
});

app.get('/api/products', async (req, res) => {
  const { q } = req.query;
  if (!validator.isAlphanumeric(q)) {
    return res.status(400).send('Invalid search query');
  }
  try {
    const result = await pool.query('SELECT * FROM products WHERE name ILIKE $1', [`%${q}%`]);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

app.post('/api/contact', csrfProtection, async (req, res) => {
  const { name, email, message } = req.body;
  if (!validator.isEmail(email) || !validator.isLength(name, { min: 1 }) || !validator.isLength(message, { min: 1 })) {
    return res.status(400).send('Invalid input');
  }
  try {
    await pool.query('INSERT INTO messages (name, email, message) VALUES ($1, $2, $3)', [name, email, message]);
    res.status(201).send('Message stored');
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
