const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: 'your_username',
  host: 'localhost',
  database: 'your_database',
  password: 'your_password',
  port: 5432,
});

const jwtSecret = 'your_jwt_secret';

// Register Endpoint
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    await pool.query('INSERT INTO users (username, email, password) VALUES ($1, $2, $3)', [username, email, hashedPassword]);
    res.status(201).send('User registered');
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Login Endpoint
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: '1h' });
      res.json({ token });
    } else {
      res.status(401).send('Invalid credentials');
    }
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Middleware for Protected Routes
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).send('Access denied');
  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) return res.status(403).send('Invalid token');
    req.user = user;
    next();
  });
};

// Get Profile Endpoint
app.get('/profile', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT username, email FROM users WHERE id = $1', [req.user.userId]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Update Profile Endpoint
app.put('/profile', authenticateToken, async (req, res) => {
  const { name, email } = req.body;
  try {
    await pool.query('UPDATE users SET username = $1, email = $2 WHERE id = $3', [name, email, req.user.userId]);
    res.send('Profile updated');
  } catch (err) {
    res.status(500).send('Server error');
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
