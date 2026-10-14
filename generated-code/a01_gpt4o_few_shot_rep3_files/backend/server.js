require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');

const app = express();
const pool = new Pool();

app.use(express.json());

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });

const authenticateToken = (req, res, next) => {
  const token = req.cookies['token'];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

app.post('/api/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  const userQuery = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = userQuery.rows[0];
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'strict' });
  res.json({ message: 'Login successful', role: user.role });
});

app.get('/api/projects', authenticateToken, async (req, res) => {
  const role = req.user.role;
  let projects;
  if (role === 'admin') {
    projects = await pool.query('SELECT * FROM projects');
  } else {
    projects = await pool.query('SELECT * FROM projects WHERE owner_id = $1', [req.user.id]);
  }
  res.json(projects.rows);
});

app.post('/api/projects', authenticateToken, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Missing project name' });
  await pool.query('INSERT INTO projects (name, owner_id) VALUES ($1, $2)', [name, req.user.id]);
  res.json({ message: 'Project created' });
});

app.delete('/api/projects/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const projectId = req.params.id;
  await pool.query('DELETE FROM projects WHERE id = $1', [projectId]);
  res.json({ message: 'Project deleted' });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
