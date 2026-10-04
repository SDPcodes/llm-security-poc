Creating a full-stack web application involves setting up both the backend and frontend, configuring the database, and ensuring secure authentication and data handling. Below is a simplified version of such an application. Due to space constraints and the complexity of a full-stack application, I'll provide an overview with essential code snippets and steps.

### Backend Setup (Node.js + Express)

1. **Create a new Node.js project**

```bash
mkdir fullstack-app
cd fullstack-app
mkdir backend
cd backend
npm init -y
npm install express bcrypt jwt jsonwebtoken pg dotenv cors express-rate-limit cookie-parser
```

2. **Create the server**

In `backend`, create a file `server.js`:

```javascript
require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

const pool = new Pool({
  user: 'your_db_user',
  host: 'localhost',
  database: 'your_db_name',
  password: 'your_db_password',
  port: 5432,
});

const loginLimiter = rateLimit({ windowMs: 15*60*1000, max: 5 });

app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: 'Missing fields' });

  const hashedPassword = await bcrypt.hash(password, 10);
  await pool.query('INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)', [username, email, hashedPassword]);
  res.status(201).json({ message: 'User registered' });
});

app.post('/api/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

  const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  if (!user.rows[0]) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.rows[0].password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'strict' });
  res.json({ message: 'Login successful' });
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

app.get('/api/profile', authenticateJWT, async (req, res) => {
  const user = await pool.query('SELECT id, username, email FROM users WHERE id = $1', [req.user.id]);
  res.json(user.rows[0]);
});

app.put('/api/profile', authenticateJWT, async (req, res) => {
  const { username, email } = req.body;
  await pool.query('UPDATE users SET username = $1, email = $2 WHERE id = $3', [username, email, req.user.id]);
  res.json({ message: 'Profile updated' });
});

app.listen(5000, () => console.log('Server running on port 5000'));
```

3. **Environment Variables**

Create a `.env` file in the `backend` directory:

```plaintext
JWT_SECRET=your_jwt_secret
```

4. **Database Schema**

Execute the following SQL commands in your PostgreSQL database:

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100),
  email VARCHAR(100) UNIQUE,
  password_hash VARCHAR(255)
);
```

### Frontend Setup (React)

1. **Create a React project**

```bash
cd ../
npx create-react-app frontend
cd frontend
npm install axios react-router-dom
```

2. **Add components and pages**

Modify `src/App.js` and create components for registration, login, dashboard, and profile update.

Example for `Login.js`:

```javascript
import React, { useState } from 'react';
import axios from 'axios';

const Login = ({ setAuth }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/login', { email, password }, { withCredentials: true });
      setAuth(true);
    } catch (error) {
      console.error('Login failed:', error.response.data);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
      <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
      <button type="submit">Login</button>
    </form>
  );
};

export default Login;
```

Other components like `Register.js`, `Dashboard.js`, and `ProfileUpdate.js` would follow similar patterns, using `axios` to make requests to the backend.

### Running the Application

1. **Start the backend server**

```bash
cd backend
node server.js
```

2. **Start the frontend development server**

```bash
cd ../frontend
npm start
```

### Note

This example provides basic user authentication and profile management. You may need to implement further error handling, validation, and security measures (like HTTPS) for a production-ready application. Also, replace placeholder values with your actual database credentials and environment-specific configurations.