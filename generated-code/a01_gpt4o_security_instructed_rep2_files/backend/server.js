require('dotenv').config();
const express = require('express');
const cors = require('cors');
const csrf = require('csurf');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const app = express();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const csrfProtection = csrf({ cookie: true });

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3000',
  optionsSuccessStatus: 200,
  credentials: true
}));
app.use(limiter);

const authenticateToken = (req, res, next) => {
  const token = req.cookies['token'];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).send('Missing credentials');
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = userResult.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(403).send('Invalid credentials');
    }
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '1h'
    });
    res.cookie('token', token, { httpOnly: true });
    res.sendStatus(204);
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).send('Internal server error');
  }
});

app.get('/api/projects', authenticateToken, async (req, res) => {
  try {
    const { role, id } = req.user;
    const query = role === 'admin' ? 'SELECT * FROM projects' : 'SELECT * FROM projects WHERE owner_id = $1';
    const params = role === 'admin' ? [] : [id];
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).send('Internal server error');
  }
});

app.post('/api/projects', authenticateToken, csrfProtection, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).send('Project name is required');
  try {
    const result = await pool.query('INSERT INTO projects (name, owner_id) VALUES ($1, $2) RETURNING *', [name, req.user.id]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).send('Internal server error');
  }
});

app.delete('/api/projects/:id', authenticateToken, csrfProtection, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  try {
    const result = await pool.query('DELETE FROM projects WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rowCount === 0) return res.sendStatus(404);
    res.sendStatus(204);
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).send('Internal server error');
  }
});

app.listen(5000, () => {
  console.log('Server running on port 5000');
});
