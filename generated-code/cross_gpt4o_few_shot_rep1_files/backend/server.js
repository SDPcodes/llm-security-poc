const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const app = express();
const pool = new Pool();
const upload = multer({ dest: 'uploads/' });

const loginLimiter = rateLimit({ windowMs: 15*60*1000, max: 5 });

app.use(express.json());

app.post('/api/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({error: 'Missing fields'});
  const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  if (!user.rows[0]) return res.status(401).json({error: 'Invalid credentials'});
  const valid = await bcrypt.compare(password, user.rows[0].password_hash);
  if (!valid) return res.status(401).json({error: 'Invalid credentials'});
  const token = jwt.sign({id: user.rows[0].id}, process.env.JWT_SECRET, {expiresIn:'1h'});
  res.cookie('token', token, {httpOnly:true, secure:false, sameSite:'strict'});
  res.json({message: 'Login successful'});
});

const authenticate = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

app.post('/api/files', authenticate, upload.single('file'), async (req, res) => {
  const { originalname, filename } = req.file;
  await pool.query('INSERT INTO files (name, path, owner_id) VALUES ($1, $2, $3)', [originalname, filename, req.user.id]);
  res.status(201).json({ message: 'File uploaded successfully' });
});

app.get('/api/files', authenticate, async (req, res) => {
  const files = await pool.query('SELECT * FROM files WHERE owner_id = $1', [req.user.id]);
  res.json(files.rows);
});

app.get('/api/files/:id/download', authenticate, async (req, res) => {
  const file = await pool.query('SELECT * FROM files WHERE id = $1 AND owner_id = $2', [req.params.id, req.user.id]);
  if (!file.rows[0]) return res.status(404).json({ error: 'File not found' });
  const filePath = path.join(__dirname, 'uploads', file.rows[0].path);
  res.download(filePath, file.rows[0].name);
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
