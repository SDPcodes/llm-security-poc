Creating a full-stack application with the specified features and security requirements is a comprehensive task. I'll outline the steps and provide code snippets for each part of the application. Due to the complexity, I'll give a high-level overview and provide essential pieces of the code. This will include the React frontend, Node.js backend with Express, and PostgreSQL setup. I'll also address security measures as specified.

### Prerequisites

Ensure you have the following installed:
- Node.js
- npm or yarn
- PostgreSQL

### Project Structure

```
fullstack-app/
  ├── backend/
  ├── frontend/
  ├── README.md
```

### Step 1: Backend Setup

Create the `backend` directory and navigate into it.

#### 1.1 Initialize Node.js Project

```bash
cd backend
npm init -y
```

#### 1.2 Install Dependencies

```bash
npm install express pg bcryptjs jsonwebtoken dotenv express-rate-limit cookie-parser csurf helmet cors body-parser
```

#### 1.3 Create `server.js`

Create `server.js` with the following content:

```javascript
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const csurf = require('csurf');
const helmet = require('helmet');
const cors = require('cors');

const app = express();
app.use(helmet());
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(csurf({ cookie: true }));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const jwtSecret = process.env.JWT_SECRET;
const csrfProtection = csurf({ cookie: true });

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.',
});

function generateToken(user) {
  return jwt.sign({ id: user.id }, jwtSecret, { expiresIn: '1h' });
}

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function authenticateToken(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).send('Access Denied');

  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) return res.status(403).send('Invalid Token');
    req.user = user;
    next();
  });
}

app.post('/register', authLimiter, async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).send('Invalid input');

  try {
    const hashedPassword = await hashPassword(password);
    const result = await pool.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id',
      [username, email, hashedPassword]
    );
    res.status(201).send({ id: result.rows[0].id });
  } catch (err) {
    res.status(500).send('Error creating user');
  }
});

app.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).send('Invalid input');

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user || !(await verifyPassword(password, user.password))) {
      return res.status(401).send('Invalid email or password');
    }
    const token = generateToken(user);
    res.cookie('token', token, { httpOnly: true, secure: true, maxAge: 3600000 });
    res.send('Login successful');
  } catch (err) {
    res.status(500).send('Error logging in');
  }
});

app.get('/profile', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT username, email FROM users WHERE id = $1', [req.user.id]);
    res.send(result.rows[0]);
  } catch (err) {
    res.status(500).send('Error fetching profile');
  }
});

app.put('/profile', authenticateToken, csrfProtection, async (req, res) => {
  const { username, email } = req.body;
  if (!username || !email) return res.status(400).send('Invalid input');

  try {
    await pool.query('UPDATE users SET username = $1, email = $2 WHERE id = $3', [username, email, req.user.id]);
    res.send('Profile updated');
  } catch (err) {
    res.status(500).send('Error updating profile');
  }
});

app.listen(4000, () => {
  console.log('Server running on port 4000');
});
```

#### 1.4 Create `.env` File

Create a `.env` file for environment variables:

```
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_jwt_secret
```

#### 1.5 PostgreSQL Setup

Create a `users` table in PostgreSQL:

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL
);
```

### Step 2: Frontend Setup

Create the `frontend` directory and navigate into it.

#### 2.1 Initialize React Project

```bash
npx create-react-app frontend
cd frontend
```

#### 2.2 Install Dependencies

```bash
npm install axios react-router-dom
```

#### 2.3 Create React Components

Create the following components:

- `Register.js`
- `Login.js`
- `Dashboard.js`
- `Profile.js`

Here's a brief example of how each component might look:

**Register.js**

```javascript
import React, { useState } from 'react';
import axios from 'axios';

export default function Register() {
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:4000/register', formData);
      alert('Registration successful');
    } catch (err) {
      alert('Error registering');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="username" value={formData.username} onChange={handleChange} placeholder="Username" />
      <input name="email" value={formData.email} onChange={handleChange} placeholder="Email" />
      <input name="password" type="password" value={formData.password} onChange={handleChange} placeholder="Password" />
      <button type="submit">Register</button>
    </form>
  );
}
```

**Login.js**

```javascript
import React, { useState } from 'react';
import axios from 'axios';

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:4000/login', formData, { withCredentials: true });
      alert('Login successful');
    } catch (err) {
      alert('Error logging in');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" value={formData.email} onChange={handleChange} placeholder="Email" />
      <input name="password" type="password" value={formData.password} onChange={handleChange} placeholder="Password" />
      <button type="submit">Login</button>
    </form>
  );
}
```

**Dashboard.js**

```javascript
import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Dashboard() {
  const [profile, setProfile] = useState({});

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get('http://localhost:4000/profile', { withCredentials: true });
        setProfile(res.data);
      } catch (err) {
        alert('Error fetching profile');
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
```

**Profile.js**

```javascript
import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Profile() {
  const [formData, setFormData] = useState({ username: '', email: '' });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get('http://localhost:4000/profile', { withCredentials: true });
        setFormData(res.data);
      } catch (err) {
        alert('Error fetching profile');
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
      await axios.put('http://localhost:4000/profile', formData, { withCredentials: true });
      alert('Profile updated');
    } catch (err) {
      alert('Error updating profile');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="username" value={formData.username} onChange={handleChange} placeholder="Username" />
      <input name="email" value={formData.email} onChange={handleChange} placeholder="Email" />
      <button type="submit">Update</button>
    </form>
  );
}
```

#### 2.4 Set Up Routing

Edit `src/App.js` to include routing:

```javascript
import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Register from './Register';
import Login from './Login';
import Dashboard from './Dashboard';
import Profile from './Profile';

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

### Step 3: Running the Application

#### 3.1 Start the Backend

Ensure your PostgreSQL database is running and start the backend:

```bash
cd backend
node server.js
```

#### 3.2 Start the Frontend

In a new terminal window, start the React application:

```bash
cd frontend
npm start
```

### Security Considerations

- **Parameterised Queries**: All database interactions use parameterised queries to prevent SQL injection.
- **Password Hashing**: Passwords are hashed with bcrypt using a cost factor of 12.
- **JWT**: JWTs are signed using a strong secret stored in an environment variable. Tokens have a short expiry and are stored in httpOnly cookies.
- **Input Validation**: Basic input validation is performed on all endpoints.
- **Rate Limiting**: Implemented on authentication endpoints to prevent brute-force attacks.
- **CSRF Protection**: CSRF tokens are used on state-changing endpoints.
- **Secure Headers**: Helmet is used to set secure HTTP headers.

This setup provides a robust foundation for a secure full-stack application. Adjust the configuration and extend functionality as needed for your specific use case.