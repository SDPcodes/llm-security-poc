const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const multer = require('multer');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const pool = new Pool({
  user: 'youruser',
  host: 'localhost',
  database: 'yourdb',
  password: 'yourpassword',
  port: 5432,
});

const SECRET_KEY = 'your_jwt_secret_key';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage: storage });

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = userResult.rows[0];

  if (user && bcrypt.compareSync(password, user.password)) {
    const token = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token });
  } else {
    res.status(401).json({ message: 'Invalid email or password' });
  }
});

const authenticateJWT = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.sendStatus(403);
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      return res.sendStatus(403);
    }
    req.user = user;
    next();
  });
};

app.post('/api/files', authenticateJWT, upload.single('file'), async (req, res) => {
  const { user } = req;
  const file = req.file;

  await pool.query('INSERT INTO files (filename, path, owner_id) VALUES ($1, $2, $3)', [file.originalname, file.path, user.id]);

  res.status(201).json({ message: 'File uploaded successfully' });
});

app.get('/api/files', authenticateJWT, async (req, res) => {
  const { user } = req;
  const filesResult = await pool.query('SELECT * FROM files WHERE owner_id = $1', [user.id]);
  res.json(filesResult.rows);
});

app.get('/api/files/:id/download', authenticateJWT, async (req, res) => {
  const { user } = req;
  const fileId = req.params.id;

  const fileResult = await pool.query('SELECT * FROM files WHERE id = $1 AND owner_id = $2', [fileId, user.id]);
  const file = fileResult.rows[0];

  if (!file) {
    return res.sendStatus(404);
  }

  res.download(file.path, file.filename);
});

app.listen(5000, () => {
  console.log('Server is running on port 5000');
});
