require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const pool = new Pool();

const loginLimiter = rateLimit({ windowMs: 15*60*1000, max: 5 });

app.post('/api/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

  const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  if (!user.rows[0]) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.rows[0].password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user.rows[0].id, role: user.rows[0].role }, process.env.JWT_SECRET, { expiresIn: '1h' });

  res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'strict' });
  res.json({ message: 'Login successful' });
});

const authenticate = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Forbidden' });
    req.user = user;
    next();
  });
};

app.get('/api/projects', authenticate, async (req, res) => {
  const { role, id } = req.user;
  let projects;
  if (role === 'admin') {
    projects = await pool.query('SELECT * FROM projects');
  } else {
    projects = await pool.query('SELECT * FROM projects WHERE owner_id = $1', [id]);
  }
  res.json(projects.rows);
});

app.post('/api/projects', authenticate, async (req, res) => {
  const { name } = req.body;
  const { id } = req.user;

  const result = await pool.query('INSERT INTO projects (name, owner_id) VALUES ($1, $2) RETURNING *', [name, id]);
  res.status(201).json(result.rows[0]);
});

app.delete('/api/projects/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { role } = req.user;

  if (role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

  await pool.query('DELETE FROM projects WHERE id = $1', [id]);
  res.json({ message: 'Project deleted' });
});

app.listen(3001, () => {
  console.log('Server running on port 3001');
});
