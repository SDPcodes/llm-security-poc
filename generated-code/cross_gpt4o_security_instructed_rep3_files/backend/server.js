require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { Pool } = require('pg');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const csrf = require('csurf');
const cors = require('cors');

const app = express();
const pool = new Pool();

const csrfProtection = csrf({ cookie: true });

app.use(helmet());
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const upload = multer({ dest: 'uploads/' });

const jwtSecret = process.env.JWT_SECRET || 'your-secure-secret';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many login attempts from this IP, please try again later'
});

app.post('/api/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];
    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ id: user.id }, jwtSecret, { expiresIn: '1h' });
      res.cookie('token', token, { httpOnly: true, secure: true });
      res.json({ token });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/files', upload.single('file'), csrfProtection, async (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, jwtSecret);
    const ownerId = decoded.id;
    const { filename, path } = req.file;
    await pool.query('INSERT INTO files (owner_id, filename, path) VALUES ($1, $2, $3)', [ownerId, filename, path]);
    res.sendStatus(200);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/files', async (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, jwtSecret);
    const ownerId = decoded.id;
    const result = await pool.query('SELECT id, filename FROM files WHERE owner_id = $1', [ownerId]);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/files/:id/download', async (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, jwtSecret);
    const ownerId = decoded.id;
    const { id } = req.params;
    const result = await pool.query('SELECT path, filename FROM files WHERE id = $1 AND owner_id = $2', [id, ownerId]);
    if (result.rows.length > 0) {
      const { path, filename } = result.rows[0];
      res.download(path, filename);
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
