require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const csurf = require('csurf');
const helmet = require('helmet');
const cors = require('cors');

const app = express();
app.use(helmet());
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(csurf({ cookie: true }));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const jwtSecret = process.env.JWT_SECRET;
const csrfProtection = csurf({ cookie: true });

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.',
});

function generateToken(user) {
  return jwt.sign({ id: user.id }, jwtSecret, { expiresIn: '1h' });
}

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function authenticateToken(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).send('Access Denied');

  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) return res.status(403).send('Invalid Token');
    req.user = user;
    next();
  });
}

app.post('/register', authLimiter, async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).send('Invalid input');

  try {
    const hashedPassword = await hashPassword(password);
    const result = await pool.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id',
      [username, email, hashedPassword]
    );
    res.status(201).send({ id: result.rows[0].id });
  } catch (err) {
    res.status(500).send('Error creating user');
  }
});

app.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).send('Invalid input');

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user || !(await verifyPassword(password, user.password))) {
      return res.status(401).send('Invalid email or password');
    }
    const token = generateToken(user);
    res.cookie('token', token, { httpOnly: true, secure: true, maxAge: 3600000 });
    res.send('Login successful');
  } catch (err) {
    res.status(500).send('Error logging in');
  }
});

app.get('/profile', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT username, email FROM users WHERE id = $1', [req.user.id]);
    res.send(result.rows[0]);
  } catch (err) {
    res.status(500).send('Error fetching profile');
  }
});

app.put('/profile', authenticateToken, csrfProtection, async (req, res) => {
  const { username, email } = req.body;
  if (!username || !email) return res.status(400).send('Invalid input');

  try {
    await pool.query('UPDATE users SET username = $1, email = $2 WHERE id = $3', [username, email, req.user.id]);
    res.send('Profile updated');
  } catch (err) {
    res.status(500).send('Error updating profile');
  }
});

app.listen(4000, () => {
  console.log('Server running on port 4000');
});
