require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const csurf = require('csurf');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const multer = require('multer');
const { Pool } = require('pg');

const app = express();

// Middleware
app.use(express.json());
app.use(helmet());
const csrfProtection = csurf({ cookie: true });

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use('/api/login', limiter);

const pool = new Pool();

const jwtSecret = process.env.JWT_SECRET;
const jwtExpiry = '1h';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).send('Invalid input');

  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];

    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ id: user.id }, jwtSecret, { expiresIn: jwtExpiry });
      res.cookie('token', token, { httpOnly: true, secure: true });
      res.send('Login successful');
    } else {
      res.status(401).send('Invalid credentials');
    }
  } catch (error) {
    res.status(500).send('Internal server error');
  }
});

app.post('/api/files', csrfProtection, upload.single('file'), async (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).send('Authentication required');

  try {
    const decoded = jwt.verify(token, jwtSecret);
    const userId = decoded.id;

    const result = await pool.query('INSERT INTO files (name, path, owner_id) VALUES ($1, $2, $3) RETURNING id', [req.file.originalname, req.file.path, userId]);
    res.send({ id: result.rows[0].id });
  } catch (error) {
    res.status(500).send('Internal server error');
  }
});

app.get('/api/files', async (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).send('Authentication required');

  try {
    const decoded = jwt.verify(token, jwtSecret);
    const userId = decoded.id;

    const result = await pool.query('SELECT id, name FROM files WHERE owner_id = $1', [userId]);
    res.send(result.rows);
  } catch (error) {
    res.status(500).send('Internal server error');
  }
});

app.get('/api/files/:id/download', async (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).send('Authentication required');

  try {
    const decoded = jwt.verify(token, jwtSecret);
    const userId = decoded.id;
    const fileId = req.params.id;

    const result = await pool.query('SELECT * FROM files WHERE id = $1 AND owner_id = $2', [fileId, userId]);
    const file = result.rows[0];

    if (file) {
      res.download(file.path, file.name);
    } else {
      res.status(404).send('File not found');
    }
  } catch (error) {
    res.status(500).send('Internal server error');
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
