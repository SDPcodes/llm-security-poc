const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');

const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).send('Invalid input');

    const hashedPassword = await bcrypt.hash(password, 12);
    await db.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3)',
      [username, email, hashedPassword]
    );
    res.sendStatus(201);
  } catch (err) {
    res.status(500).send('Error registering user');
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).send('Invalid input');

    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).send('Invalid credentials');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).send('Invalid credentials');

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.cookie('token', token, { httpOnly: true }).sendStatus(200);
  } catch (err) {
    res.status(500).send('Error logging in');
  }
};

const getProfile = async (req, res) => {
  try {
    const result = await db.query('SELECT username, email FROM users WHERE id = $1', [req.userId]);
    const user = result.rows[0];
    res.json(user);
  } catch (err) {
    res.status(500).send('Error fetching profile');
  }
};

const updateProfile = async (req, res) => {
  try {
    const { username, email } = req.body;
    if (!username || !email) return res.status(400).send('Invalid input');

    await db.query('UPDATE users SET username = $1, email = $2 WHERE id = $3', [username, email, req.userId]);
    res.sendStatus(200);
  } catch (err) {
    res.status(500).send('Error updating profile');
  }
};

module.exports = { registerUser, loginUser, getProfile, updateProfile };
