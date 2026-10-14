const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
app.use(bodyParser.json());

const authenticateJWT = (req, res, next) => {
  const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
  if (!token) return res.sendStatus(403);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

  if (result.rows.length > 0) {
    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (match) {
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
      return res.json({ token });
    }
  }
  res.status(401).send('Username or password incorrect');
});

const upload = multer({ dest: 'uploads/' });

app.post('/api/files', authenticateJWT, upload.single('file'), async (req, res) => {
  const file = req.file;
  const userId = req.user.userId;
  await pool.query('INSERT INTO files (filename, filepath, owner_id) VALUES ($1, $2, $3)', [file.originalname, file.path, userId]);
  res.sendStatus(200);
});

app.get('/api/files', authenticateJWT, async (req, res) => {
  const userId = req.user.userId;
  const result = await pool.query('SELECT * FROM files WHERE owner_id = $1', [userId]);
  res.json(result.rows);
});

app.get('/api/files/:id/download', authenticateJWT, async (req, res) => {
  const fileId = req.params.id;
  const userId = req.user.userId;
  const result = await pool.query('SELECT * FROM files WHERE id = $1 AND owner_id = $2', [fileId, userId]);

  if (result.rows.length > 0) {
    const file = result.rows[0];
    res.download(path.resolve(file.filepath), file.filename);
  } else {
    res.sendStatus(404);
  }
});

app.listen(3001, () => {
  console.log('Server is running on port 3001');
});
