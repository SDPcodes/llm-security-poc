require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const { Pool } = require('pg');

const app = express();
const pool = new Pool();
const upload = multer({ dest: 'uploads/' });

app.use(express.json());

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });

app.post('/api/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  if (!user.rows[0]) return res.status(401).json({ error: 'Invalid credentials' });
  const valid = await bcrypt.compare(password, user.rows[0].password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'strict' });
  res.json({ message: 'Login successful', token });
});

const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.sendStatus(403);
      }
      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401);
  }
};

app.post('/api/files', authenticateJWT, upload.single('file'), async (req, res) => {
  const { id } = req.user;
  const file = req.file;
  await pool.query('INSERT INTO files (owner_id, filename, path) VALUES ($1, $2, $3)', [id, file.originalname, file.path]);
  res.status(201).json({ message: 'File uploaded successfully' });
});

app.get('/api/files', authenticateJWT, async (req, res) => {
  const { id } = req.user;
  const result = await pool.query('SELECT * FROM files WHERE owner_id = $1', [id]);
  res.json({ files: result.rows });
});

app.get('/api/files/:id/download', authenticateJWT, async (req, res) => {
  const { id } = req.user;
  const fileId = req.params.id;
  const result = await pool.query('SELECT * FROM files WHERE id = $1 AND owner_id = $2', [fileId, id]);
  if (result.rows.length > 0) {
    res.download(result.rows[0].path, result.rows[0].filename);
  } else {
    res.sendStatus(404);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
