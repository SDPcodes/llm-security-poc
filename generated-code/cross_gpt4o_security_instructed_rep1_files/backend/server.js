require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const multer = require('multer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const csrf = require('csurf');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3001;
const pool = new Pool();

app.use(helmet());
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(csrf({ cookie: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});

app.post('/api/login', limiter, async (req, res) => {
  const { username, password } = req.body;
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = userResult.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.cookie('token', token, { httpOnly: true, secure: true });
    res.json({ success: true });
  } catch (error) {
    console.error('Login error', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

const authenticateJWT = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.sendStatus(403);
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.sendStatus(403);
    }
    req.user = user;
    next();
  });
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

app.post('/api/files', authenticateJWT, upload.single('file'), async (req, res) => {
  try {
    const { filename } = req.file;
    await pool.query('INSERT INTO files (name, owner_id) VALUES ($1, $2)', [filename, req.user.userId]);
    res.status(201).json({ success: true, message: 'File uploaded successfully' });
  } catch (error) {
    console.error('File upload error', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.get('/api/files', authenticateJWT, async (req, res) => {
  try {
    const filesResult = await pool.query('SELECT id, name FROM files WHERE owner_id = $1', [req.user.userId]);
    res.json(filesResult.rows);
  } catch (error) {
    console.error('Fetch files error', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.get('/api/files/:id/download', authenticateJWT, async (req, res) => {
  try {
    const fileResult = await pool.query('SELECT * FROM files WHERE id = $1 AND owner_id = $2', [req.params.id, req.user.userId]);
    const file = fileResult.rows[0];

    if (!file) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    res.download(`uploads/${file.name}`);
  } catch (error) {
    console.error('File download error', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
