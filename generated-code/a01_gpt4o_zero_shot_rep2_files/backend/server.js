require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const pool = new Pool();

app.use(cors());
app.use(bodyParser.json());

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = userResult.rows[0];

  if (user && bcrypt.compareSync(password, user.password)) {
    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.ACCESS_TOKEN_SECRET);
    res.json({ token, user: { id: user.id, role: user.role } });
  } else {
    res.status(401).send('Email or password incorrect');
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  const userResult = await pool.query('SELECT id, role FROM users WHERE id = $1', [req.user.userId]);
  const user = userResult.rows[0];
  res.json(user);
});

app.get('/api/projects', authenticateToken, async (req, res) => {
  let projects;
  if (req.user.role === 'admin') {
    const result = await pool.query('SELECT * FROM projects');
    projects = result.rows;
  } else {
    const result = await pool.query('SELECT * FROM projects WHERE owner_id = $1', [req.user.userId]);
    projects = result.rows;
  }
  res.json(projects);
});

app.post('/api/projects', authenticateToken, async (req, res) => {
  const { name } = req.body;
  const result = await pool.query(
    'INSERT INTO projects (name, owner_id) VALUES ($1, $2) RETURNING *',
    [name, req.user.userId]
  );
  res.status(201).json(result.rows[0]);
});

app.delete('/api/projects/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const projectId = parseInt(req.params.id);
  await pool.query('DELETE FROM projects WHERE id = $1', [projectId]);
  res.sendStatus(204);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
