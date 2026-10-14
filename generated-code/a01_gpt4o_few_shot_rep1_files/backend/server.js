const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const { Pool } = require('pg');

const app = express();
const pool = new Pool();
app.use(express.json());
app.use(cookieParser());

const loginLimiter = rateLimit({ windowMs: 15*60*1000, max: 5 });

const authenticateJWT = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.sendStatus(401);
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.sendStatus(403);
    }
    req.user = user;
    next();
  });
};

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

app.get('/api/projects', authenticateJWT, async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  let projects;
  if (userRole === 'admin') {
    projects = await pool.query('SELECT * FROM projects');
  } else {
    projects = await pool.query('SELECT * FROM projects WHERE owner_id = $1', [userId]);
  }
  res.json(projects.rows);
});

app.post('/api/projects', authenticateJWT, async (req, res) => {
  const userId = req.user.id;
  const { name } = req.body;
  const newProject = await pool.query('INSERT INTO projects (name, owner_id) VALUES ($1, $2) RETURNING *', [name, userId]);
  res.json(newProject.rows[0]);
});

app.delete('/api/projects/:id', authenticateJWT, async (req, res) => {
  const userRole = req.user.role;
  if (userRole !== 'admin') {
    return res.sendStatus(403);
  }
  const projectId = req.params.id;
  await pool.query('DELETE FROM projects WHERE id = $1', [projectId]);
  res.sendStatus(204);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
