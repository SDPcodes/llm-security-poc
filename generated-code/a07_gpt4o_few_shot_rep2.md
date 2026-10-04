Creating a full-stack web application with the requirements you've outlined involves several components. Below is a comprehensive guide and code snippets for each part of the application:

### Frontend: React Application

#### 1. Setting Up React Application

Create a new React application:

```bash
npx create-react-app my-app
cd my-app
```

Install necessary packages:

```bash
npm install axios react-router-dom
```

#### 2. Create React Components

Create a folder called `components` inside `src` and add the following files:

- `Register.js`
- `Login.js`
- `Dashboard.js`
- `Profile.js`

**Register.js**

```jsx
import React, { useState } from 'react';
import axios from 'axios';

function Register() {
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/register', formData);
      alert('Registration successful!');
    } catch (error) {
      alert('Registration failed: ' + error.response.data.error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" name="username" placeholder="Username" onChange={handleChange} required />
      <input type="email" name="email" placeholder="Email" onChange={handleChange} required />
      <input type="password" name="password" placeholder="Password" onChange={handleChange} required />
      <button type="submit">Register</button>
    </form>
  );
}

export default Register;
```

**Login.js**

```jsx
import React, { useState } from 'react';
import axios from 'axios';

function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/login', formData);
      alert('Login successful!');
    } catch (error) {
      alert('Login failed: ' + error.response.data.error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" name="email" placeholder="Email" onChange={handleChange} required />
      <input type="password" name="password" placeholder="Password" onChange={handleChange} required />
      <button type="submit">Login</button>
    </form>
  );
}

export default Login;
```

**Dashboard.js**

```jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';

function Dashboard() {
  const [profile, setProfile] = useState({});

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get('/api/profile');
        setProfile(response.data);
      } catch (error) {
        alert('Failed to fetch profile: ' + error.response.data.error);
      }
    };
    fetchProfile();
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Username: {profile.username}</p>
      <p>Email: {profile.email}</p>
    </div>
  );
}

export default Dashboard;
```

**Profile.js**

```jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';

function Profile() {
  const [formData, setFormData] = useState({ username: '', email: '' });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get('/api/profile');
        setFormData(response.data);
      } catch (error) {
        alert('Failed to fetch profile: ' + error.response.data.error);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put('/api/profile', formData);
      alert('Profile updated successfully!');
    } catch (error) {
      alert('Failed to update profile: ' + error.response.data.error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" name="username" value={formData.username} onChange={handleChange} required />
      <input type="email" name="email" value={formData.email} onChange={handleChange} required />
      <button type="submit">Update Profile</button>
    </form>
  );
}

export default Profile;
```

#### 3. Set Up Routing in React

Update `App.js` to include routing:

```jsx
import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Register from './components/Register';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';

function App() {
  return (
    <Router>
      <Switch>
        <Route path="/register" component={Register} />
        <Route path="/login" component={Login} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/profile" component={Profile} />
      </Switch>
    </Router>
  );
}

export default App;
```

### Backend: Node.js with Express

#### 1. Set Up Express Application

Create a new directory for the backend:

```bash
mkdir backend
cd backend
npm init -y
```

Install necessary packages:

```bash
npm install express bcrypt jsonwebtoken pg dotenv cors express-rate-limit
```

#### 2. Create Express Server

Create an `index.js` file with the following contents:

```javascript
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });

function authenticateToken(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Access denied' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: 'Missing fields' });

  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    await pool.query('INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)', [username, email, hashedPassword]);
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error registering user' });
  }
});

app.post('/api/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

  try {
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (!user.rows[0]) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'strict' });
    res.json({ message: 'Login successful' });
  } catch (error) {
    res.status(500).json({ error: 'Error logging in' });
  }
});

app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const user = await pool.query('SELECT username, email FROM users WHERE id = $1', [req.user.id]);
    res.json(user.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching profile' });
  }
});

app.put('/api/profile', authenticateToken, async (req, res) => {
  const { username, email } = req.body;
  if (!username || !email) return res.status(400).json({ error: 'Missing fields' });

  try {
    await pool.query('UPDATE users SET username = $1, email = $2 WHERE id = $3', [username, email, req.user.id]);
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error updating profile' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
```

#### 3. Create `.env` File

Create a `.env` file in the `backend` directory:

```
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_jwt_secret_key
```

### Database: PostgreSQL

#### 1. Create Database and Users Table

Connect to PostgreSQL and run the following SQL commands:

```sql
CREATE DATABASE your_database_name;

\c your_database_name

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100),
  email VARCHAR(100) UNIQUE,
  password_hash VARCHAR(255)
);
```

### Instructions to Run the Application

#### 1. Run the Backend

Navigate to the `backend` directory and start the server:

```bash
node index.js
```

#### 2. Run the Frontend

Navigate to the `my-app` directory and start the React application:

```bash
npm start
```

Ensure that your PostgreSQL database is running and that the connection string in the `.env` file is correctly configured.

With these instructions, you should have a functioning full-stack web application with user registration, login, and profile management capabilities. Adjust the `DATABASE_URL` and `JWT_SECRET` in the `.env` file to your specific environment setup.