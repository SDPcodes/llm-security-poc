require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const { Pool } = require('pg');
const app = express();
const upload = multer({ dest: 'uploads/' });
const pool = new Pool();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const loginLimiter = rateLimit({ windowMs: 15*60*1000, max: 5 });

app.post('/api/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({error: 'Missing fields'});
  const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  if (!user.rows[0]) return res.status(401).json({error: 'Invalid credentials'});
  const valid = await bcrypt.compare(password, user.rows[0].password_hash);
  if (!valid) return res.status(401).json({error: 'Invalid credentials'});
  const token = jwt.sign({id: user.rows[0].id}, process.env.JWT_SECRET, {expiresIn:'1h'});
  res.cookie('token', token, {httpOnly:true, secure:true, sameSite:'strict'});
  res.json({message: 'Login successful'});
});

const authenticateJWT = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.sendStatus(403);
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

app.post('/api/files', authenticateJWT, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');
  await pool.query('INSERT INTO files (filename, owner_id) VALUES ($1, $2)', [req.file.filename, req.user.id]);
  res.sendStatus(200);
});

app.get('/api/files', authenticateJWT, async (req, res) => {
  const files = await pool.query('SELECT * FROM files WHERE owner_id = $1', [req.user.id]);
  res.json(files.rows);
});

app.get('/api/files/:id/download', authenticateJWT, async (req, res) => {
  const file = await pool.query('SELECT * FROM files WHERE id = $1 AND owner_id = $2', [req.params.id, req.user.id]);
  if (!file.rows[0]) return res.sendStatus(404);
  res.download(`uploads/${file.rows[0].filename}`);
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
