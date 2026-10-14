require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const pool = new Pool();

app.use(cors());
app.use(bodyParser.json());

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  next();
};

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  pool.query('SELECT * FROM users WHERE email = $1', [email], (err, result) => {
    if (err || result.rows.length === 0) return res.sendStatus(401);
    const user = result.rows[0];
    bcrypt.compare(password, user.password_hash, (err, isMatch) => {
      if (err || !isMatch) return res.sendStatus(401);
      const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET);
      res.json({ token, role: user.role });
    });
  });
});

app.get('/api/projects', authenticateToken, (req, res) => {
  const query = req.user.role === 'admin' ? 'SELECT * FROM projects' : 'SELECT * FROM projects WHERE owner_id = $1';
  const params = req.user.role === 'admin' ? [] : [req.user.id];
  pool.query(query, params, (err, result) => {
    if (err) return res.sendStatus(500);
    res.json(result.rows);
  });
});

app.post('/api/projects', authenticateToken, (req, res) => {
  const { name } = req.body;
  const ownerId = req.user.id;
  pool.query('INSERT INTO projects (name, owner_id) VALUES ($1, $2) RETURNING *', [name, ownerId], (err, result) => {
    if (err) return res.sendStatus(500);
    res.status(201).json(result.rows[0]);
  });
});

app.delete('/api/projects/:id', [authenticateToken, isAdmin], (req, res) => {
  const { id } = req.params;
  pool.query('DELETE FROM projects WHERE id = $1 RETURNING *', [id], (err, result) => {
    if (err || result.rows.length === 0) return res.sendStatus(404);
    res.sendStatus(204);
  });
});

app.listen(process.env.PORT || 5000, () => {
  console.log('Server is running');
});
