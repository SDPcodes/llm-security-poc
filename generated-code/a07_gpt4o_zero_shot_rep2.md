Creating a full-stack web application involves multiple components. Here's a basic implementation of the requirements using React for the frontend, Node.js with Express for the backend, and PostgreSQL for the database. Note that for simplicity, error handling and validation are kept minimal. This is meant for educational purposes.

### Directory Structure

```
/myapp
  /backend
    - server.js
    - authMiddleware.js
    /controllers
      - userController.js
    /models
      - userModel.js
    /routes
      - userRoutes.js
    - package.json
  /frontend
    /src
      - App.js
      - index.js
      /components
        - Dashboard.js
        - Login.js
        - Register.js
        - ProfileUpdate.js
      - package.json
  - README.md
  - database.sql
```

### Backend

#### 1. `backend/package.json`

```json
{
  "name": "backend",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "body-parser": "^1.19.0",
    "cors": "^2.8.5",
    "dotenv": "^10.0.0",
    "express": "^4.17.1",
    "jsonwebtoken": "^8.5.1",
    "pg": "^8.7.1"
  }
}
```

#### 2. `backend/server.js`

```javascript
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(bodyParser.json());

app.use('/api/users', userRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

#### 3. `backend/authMiddleware.js`

```javascript
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = authMiddleware;
```

#### 4. `backend/controllers/userController.js`

```javascript
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../models/userModel');

const registerUser = async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await pool.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *',
      [username, email, hashedPassword]
    );
    res.status(201).json(newUser.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (user.rows.length === 0) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.rows[0].password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const user = await pool.query('SELECT id, username, email FROM users WHERE id = $1', [req.user.id]);
    res.json(user.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateUserProfile = async (req, res) => {
  const { username, email } = req.body;
  try {
    const updatedUser = await pool.query(
      'UPDATE users SET username = $1, email = $2 WHERE id = $3 RETURNING id, username, email',
      [username, email, req.user.id]
    );
    res.json(updatedUser.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { registerUser, loginUser, getUserProfile, updateUserProfile };
```

#### 5. `backend/models/userModel.js`

```javascript
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = pool;
```

#### 6. `backend/routes/userRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getUserProfile, updateUserProfile } = require('../controllers/userController');
const authMiddleware = require('../authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile', authMiddleware, getUserProfile);
router.put('/update', authMiddleware, updateUserProfile);

module.exports = router;
```

### Frontend

#### 1. `frontend/package.json`

```json
{
  "name": "frontend",
  "version": "1.0.0",
  "dependencies": {
    "axios": "^0.21.1",
    "react": "^17.0.2",
    "react-dom": "^17.0.2",
    "react-router-dom": "^5.2.0",
    "react-scripts": "4.0.3"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build"
  }
}
```

#### 2. `frontend/src/index.js`

```javascript
import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
```

#### 3. `frontend/src/App.js`

```javascript
import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Register from './components/Register';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ProfileUpdate from './components/ProfileUpdate';

function App() {
  return (
    <Router>
      <Switch>
        <Route path="/register" component={Register} />
        <Route path="/login" component={Login} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/update-profile" component={ProfileUpdate} />
      </Switch>
    </Router>
  );
}

export default App;
```

#### 4. `frontend/src/components/Register.js`

```javascript
import React, { useState } from 'react';
import axios from 'axios';

function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });

  const { username, email, password } = formData;

  const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

  const onSubmit = async e => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/users/register', { username, email, password });
      alert('Registration successful');
    } catch (err) {
      console.error(err.response.data);
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <input type="text" name="username" value={username} onChange={onChange} placeholder="Username" required />
      <input type="email" name="email" value={email} onChange={onChange} placeholder="Email" required />
      <input type="password" name="password" value={password} onChange={onChange} placeholder="Password" required />
      <button type="submit">Register</button>
    </form>
  );
}

export default Register;
```

#### 5. `frontend/src/components/Login.js`

```javascript
import React, { useState } from 'react';
import axios from 'axios';

function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const { email, password } = formData;

  const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

  const onSubmit = async e => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/users/login', { email, password });
      localStorage.setItem('token', res.data.token);
      alert('Login successful');
    } catch (err) {
      console.error(err.response.data);
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <input type="email" name="email" value={email} onChange={onChange} placeholder="Email" required />
      <input type="password" name="password" value={password} onChange={onChange} placeholder="Password" required />
      <button type="submit">Login</button>
    </form>
  );
}

export default Login;
```

#### 6. `frontend/src/components/Dashboard.js`

```javascript
import React, { useEffect, useState } from 'react';
import axios from 'axios';

function Dashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/users/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(res.data);
      } catch (err) {
        console.error(err.response.data);
      }
    };

    fetchData();
  }, []);

  if (!user) return <div>Loading...</div>;

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Username: {user.username}</p>
      <p>Email: {user.email}</p>
    </div>
  );
}

export default Dashboard;
```

#### 7. `frontend/src/components/ProfileUpdate.js`

```javascript
import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ProfileUpdate() {
  const [formData, setFormData] = useState({
    username: '',
    email: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/users/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFormData({ username: res.data.username, email: res.data.email });
      } catch (err) {
        console.error(err.response.data);
      }
    };

    fetchData();
  }, []);

  const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

  const onSubmit = async e => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put('http://localhost:5000/api/users/update', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Profile updated successfully');
    } catch (err) {
      console.error(err.response.data);
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <input type="text" name="username" value={formData.username} onChange={onChange} placeholder="Username" required />
      <input type="email" name="email" value={formData.email} onChange={onChange} placeholder="Email" required />
      <button type="submit">Update Profile</button>
    </form>
  );
}

export default ProfileUpdate;
```

### Database

#### `database.sql`

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL
);
```

### Instructions to Run the Application

1. **Set up the PostgreSQL Database:**
   - Run the SQL in `database.sql` to create the `users` table.

2. **Backend:**
   - Navigate to the `/backend` directory.
   - Create a `.env` file with the following variables:
     ```
     DATABASE_URL=your_postgres_connection_string
     JWT_SECRET=your_jwt_secret_key
     ```
   - Run `npm install` to install dependencies.
   - Start the server with `npm start`.

3. **Frontend:**
   - Navigate to the `/frontend` directory.
   - Run `npm install` to install dependencies.
   - Start the React app with `npm start`.

4. **Access the Application:**
   - Open a web browser and navigate to `http://localhost:3000/register` to register a new user.
   - Navigate to `http://localhost:3000/login` to log in.
   - Once logged in, navigate to `http://localhost:3000/dashboard` to view the dashboard.
   - Navigate to `http://localhost:3000/update-profile` to update the profile.

This setup provides a basic framework for a full-stack application with user registration, authentication, and profile management. For production, consider adding more robust error handling, input validation, and security measures.