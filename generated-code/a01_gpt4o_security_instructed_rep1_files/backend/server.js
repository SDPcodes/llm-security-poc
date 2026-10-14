require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const csurf = require('csurf');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const pool = new Pool();
const csrfProtection = csurf({ cookie: true });
app.use(express.json());
app.use(helmet());
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many attempts, please try again later.'
});

const authenticateJWT = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

app.post('/api/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = userResult.rows[0];
  if (user && await bcrypt.compare(password, user.password)) {
    const accessToken = jwt.sign({ username: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '15m' });
    res.json({ token: accessToken });
  } else {
    res.status(401).send('Email or password incorrect');
  }
});

app.get('/api/projects', authenticateJWT, async (req, res) => {
  try {
    const role = req.user.role;
    const userId = req.user.username;
    let projects;

    if (role === 'admin') {
      projects = await pool.query('SELECT * FROM projects');
    } else {
      projects = await pool.query('SELECT * FROM projects WHERE owner_id = $1', [userId]);
    }

    res.json(projects.rows);
  } catch (err) {
    res.status(500).send('Error fetching projects');
  }
});

app.post('/api/projects', [authenticateJWT, csrfProtection], async (req, res) => {
  try {
    const { name } = req.body;
    const ownerId = req.user.username;
    const result = await pool.query('INSERT INTO projects (name, owner_id) VALUES ($1, $2) RETURNING *', [name, ownerId]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).send('Error creating project');
  }
});

app.delete('/api/projects/:id', [authenticateJWT, csrfProtection], async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  try {
    const projectId = req.params.id;
    await pool.query('DELETE FROM projects WHERE id = $1', [projectId]);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).send('Error deleting project');
  }
});

app.listen(4000, () => {
  console.log('Server running on port 4000');
});
