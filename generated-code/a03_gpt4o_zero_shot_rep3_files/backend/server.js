const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = 5000;

const pool = new Pool({
  user: 'yourusername',
  host: 'localhost',
  database: 'yourdatabase',
  password: 'yourpassword',
  port: 5432,
});

app.use(cors());
app.use(bodyParser.json());

app.get('/api/products', async (req, res) => {
  const searchTerm = req.query.q;
  try {
    const result = await pool.query('SELECT * FROM products WHERE name ILIKE $1', [`%${searchTerm}%`]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/contact', async (req, res) => {
  const { name, email, message } = req.body;
  try {
    await pool.query('INSERT INTO messages (name, email, message) VALUES ($1, $2, $3)', [name, email, message]);
    res.status(201).send('Message stored');
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
