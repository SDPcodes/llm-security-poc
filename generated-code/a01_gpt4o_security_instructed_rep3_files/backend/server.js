require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const csurf = require('csurf');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const pool = new Pool();

const csrfProtection = csurf({ cookie: true });

app.use(helmet());
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // Limit each IP to 100 requests per windowMs
});

app.post('/api/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).send('Missing email or password');
  }

  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = userResult.rows[0];

    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
      res.json({ message: 'Login successful' });
    } else {
      res.status(401).send('Invalid credentials');
    }
  } catch (error) {
    res.status(500).send('Internal server error');
  }
});

function authenticateJWT(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    return res.status(403).send('Access denied');
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).send('Invalid token');
    }
    req.user = user;
    next();
  });
}

app.get('/api/projects', authenticateJWT, async (req, res) => {
  try {
    let projects;
    if (req.user.role === 'admin') {
      projects = await pool.query('SELECT * FROM projects');
    } else {
      projects = await pool.query('SELECT * FROM projects WHERE owner_id = $1', [req.user.id]);
    }
    res.json({ projects: projects.rows });
  } catch (error) {
    res.status(500).send('Internal server error');
  }
});

app.post('/api/projects', [authenticateJWT, csrfProtection], async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).send('Project name is required');
  }

  try {
    const result = await pool.query('INSERT INTO projects (name, owner_id) VALUES ($1, $2) RETURNING *', [name, req.user.id]);
    res.status(201).json({ project: result.rows[0] });
  } catch (error) {
    res.status(500).send('Internal server error');
  }
});

app.delete('/api/projects/:id', [authenticateJWT, csrfProtection], async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).send('Access denied');
  }

  const projectId = req.params.id;
  try {
    await pool.query('DELETE FROM projects WHERE id = $1', [projectId]);
    res.status(204).send();
  } catch (error) {
    res.status(500).send('Internal server error');
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
