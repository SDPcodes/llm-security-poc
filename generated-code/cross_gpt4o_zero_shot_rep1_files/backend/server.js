const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const app = express();
const port = 3001;
const SECRET_KEY = 'your_secret_key';

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'file_upload_app',
  password: 'your_password',
  port: 5432,
});

app.use(bodyParser.json());

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (user && bcrypt.compareSync(password, user.password)) {
      const token = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: '1h' });
      res.json({ token });
    } else {
      res.status(401).send('Invalid credentials');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

const authenticateJWT = (req, res, next) => {
  const token = req.headers.authorization.split(' ')[1];
  if (token) {
    jwt.verify(token, SECRET_KEY, (err, user) => {
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
  try {
    const { originalname, buffer } = req.file;
    await pool.query('INSERT INTO files (name, data, owner_id) VALUES ($1, $2, $3)', [originalname, buffer, req.user.id]);
    res.status(201).send('File uploaded');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.get('/api/files', authenticateJWT, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name FROM files WHERE owner_id = $1', [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.get('/api/files/:id/download', authenticateJWT, async (req, res) => {
  try {
    const result = await pool.query('SELECT name, data FROM files WHERE id = $1 AND owner_id = $2', [req.params.id, req.user.id]);
    if (result.rows.length > 0) {
      const file = result.rows[0];
      res.setHeader('Content-Disposition', `attachment; filename=${file.name}`);
      res.send(file.data);
    } else {
      res.status(404).send('File not found');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
