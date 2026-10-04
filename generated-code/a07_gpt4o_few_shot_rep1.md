Creating a full-stack web application involves setting up multiple components. Below, I'll walk you through creating a simple application using React for the frontend, Node.js with Express for the backend, and PostgreSQL as the database. I'll provide code snippets and configuration for each component.

**1. Database Setup (PostgreSQL):**

First, create a PostgreSQL database and a `users` table.

```sql
-- Create database
CREATE DATABASE myapp;

-- Connect to the database
\c myapp

-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL
);
```

**2. Backend Setup (Node.js with Express):**

Create a directory for your backend project, for example, `backend`.

**`backend/package.json`:**

```json
{
  "name": "backend",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "bcrypt": "^5.0.1",
    "cors": "^2.8.5",
    "dotenv": "^10.0.0",
    "express": "^4.17.1",
    "jsonwebtoken": "^8.5.1",
    "pg": "^8.6.0",
    "express-rate-limit": "^5.3.0",
    "body-parser": "^1.19.0"
  }
}
```

**Install dependencies:**

```bash
cd backend
npm install
```

**`backend/.env`:**

```plaintext
DATABASE_URL=postgresql://youruser:yourpassword@localhost:5432/myapp
JWT_SECRET=your_jwt_secret
```

**`backend/index.js`:**

```javascript
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');

require('dotenv').config();

const app = express();
const port = 5000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.use(cors());
app.use(bodyParser.json());

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });

const authenticateToken = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  const hash = await bcrypt.hash(password, 10);
  try {
    await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)',
      [username, email, hash]
    );
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Email already exists' });
  }
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

app.get('/api/profile', authenticateToken, async (req, res) => {
  const user = await pool.query('SELECT id, username, email FROM users WHERE id = $1', [req.user.id]);
  res.json(user.rows[0]);
});

app.put('/api/profile', authenticateToken, async (req, res) => {
  const { username, email } = req.body;
  if (!username || !email) return res.status(400).json({ error: 'Missing fields' });

  await pool.query('UPDATE users SET username = $1, email = $2 WHERE id = $3', [username, email, req.user.id]);
  res.json({ message: 'Profile updated successfully' });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
```

**3. Frontend Setup (React):**

Create a directory for your frontend project, for example, `frontend`.

**`frontend/package.json`:**

```json
{
  "name": "frontend",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "axios": "^0.21.1",
    "react": "^17.0.2",
    "react-dom": "^17.0.2",
    "react-router-dom": "^5.2.0",
    "react-scripts": "4.0.3"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  }
}
```

**Install dependencies:**

```bash
cd frontend
npm install
```

**`frontend/src/App.js`:**

```javascript
import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Register from './Register';
import Login from './Login';
import Dashboard from './Dashboard';

function App() {
  return (
    <Router>
      <Switch>
        <Route path="/register" component={Register} />
        <Route path="/login" component={Login} />
        <Route path="/dashboard" component={Dashboard} />
      </Switch>
    </Router>
  );
}

export default App;
```

**`frontend/src/Register.js`:**

```javascript
import React, { useState } from 'react';
import axios from 'axios';

function Register() {
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/register', formData);
      alert('Registration successful');
    } catch (error) {
      alert('Error registering user');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" name="username" placeholder="Username" onChange={handleChange} />
      <input type="email" name="email" placeholder="Email" onChange={handleChange} />
      <input type="password" name="password" placeholder="Password" onChange={handleChange} />
      <button type="submit">Register</button>
    </form>
  );
}

export default Register;
```

**`frontend/src/Login.js`:**

```javascript
import React, { useState } from 'react';
import axios from 'axios';

function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/login', formData, { withCredentials: true });
      alert('Login successful');
    } catch (error) {
      alert('Invalid credentials');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" name="email" placeholder="Email" onChange={handleChange} />
      <input type="password" name="password" placeholder="Password" onChange={handleChange} />
      <button type="submit">Login</button>
    </form>
  );
}

export default Login;
```

**`frontend/src/Dashboard.js`:**

```javascript
import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Dashboard() {
  const [profile, setProfile] = useState({ username: '', email: '' });
  const [formData, setFormData] = useState({ username: '', email: '' });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/profile', { withCredentials: true });
        setProfile(response.data);
      } catch (error) {
        alert('Error fetching profile');
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put('http://localhost:5000/api/profile', formData, { withCredentials: true });
      alert('Profile updated successfully');
    } catch (error) {
      alert('Error updating profile');
    }
  };

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Username: {profile.username}</p>
      <p>Email: {profile.email}</p>

      <form onSubmit={handleSubmit}>
        <input type="text" name="username" placeholder="New Username" onChange={handleChange} />
        <input type="email" name="email" placeholder="New Email" onChange={handleChange} />
        <button type="submit">Update Profile</button>
      </form>
    </div>
  );
}

export default Dashboard;
```

**4. Running the Application:**

- Start the backend server:

  ```bash
  cd backend
  npm start
  ```

- Start the React frontend:

  ```bash
  cd frontend
  npm start
  ```

This setup provides a basic full-stack application with user authentication, registration, and profile update functionalities. You can expand on this by adding additional features and improving error handling, styling, and security practices.