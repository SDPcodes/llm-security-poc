Creating a full-stack web application involves multiple components: the frontend, the backend, and the database. Below, I'll provide you with a basic setup for each part.

### Frontend (React)

1. **Create React App**

   Install `create-react-app` if you haven't already:

   ```bash
   npx create-react-app my-app
   cd my-app
   ```

2. **Install Dependencies**

   Install Axios for HTTP requests and React Router for navigation:

   ```bash
   npm install axios react-router-dom
   ```

3. **Create React Components**

   - **Registration Page (`src/components/Register.js`)**

     ```jsx
     import React, { useState } from 'react';
     import axios from 'axios';

     const Register = () => {
       const [form, setForm] = useState({ username: '', email: '', password: '' });

       const handleChange = (e) => {
         setForm({ ...form, [e.target.name]: e.target.value });
       };

       const handleSubmit = async (e) => {
         e.preventDefault();
         try {
           await axios.post('http://localhost:5000/register', form);
           alert('Registration successful');
         } catch (error) {
           console.error(error);
           alert('Error registering');
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
     };

     export default Register;
     ```

   - **Login Page (`src/components/Login.js`)**

     ```jsx
     import React, { useState } from 'react';
     import axios from 'axios';

     const Login = () => {
       const [form, setForm] = useState({ email: '', password: '' });

       const handleChange = (e) => {
         setForm({ ...form, [e.target.name]: e.target.value });
       };

       const handleSubmit = async (e) => {
         e.preventDefault();
         try {
           const response = await axios.post('http://localhost:5000/login', form);
           localStorage.setItem('token', response.data.token);
           alert('Login successful');
         } catch (error) {
           console.error(error);
           alert('Error logging in');
         }
       };

       return (
         <form onSubmit={handleSubmit}>
           <input type="email" name="email" placeholder="Email" onChange={handleChange} />
           <input type="password" name="password" placeholder="Password" onChange={handleChange} />
           <button type="submit">Login</button>
         </form>
       );
     };

     export default Login;
     ```

   - **Dashboard (`src/components/Dashboard.js`)**

     ```jsx
     import React, { useEffect, useState } from 'react';
     import axios from 'axios';

     const Dashboard = () => {
       const [profile, setProfile] = useState(null);

       useEffect(() => {
         const fetchProfile = async () => {
           const token = localStorage.getItem('token');
           try {
             const response = await axios.get('http://localhost:5000/profile', {
               headers: { Authorization: `Bearer ${token}` },
             });
             setProfile(response.data);
           } catch (error) {
             console.error(error);
           }
         };

         fetchProfile();
       }, []);

       if (!profile) return <div>Loading...</div>;

       return (
         <div>
           <h1>Dashboard</h1>
           <p>Username: {profile.username}</p>
           <p>Email: {profile.email}</p>
         </div>
       );
     };

     export default Dashboard;
     ```

   - **Profile Update (`src/components/ProfileUpdate.js`)**

     ```jsx
     import React, { useState } from 'react';
     import axios from 'axios';

     const ProfileUpdate = () => {
       const [form, setForm] = useState({ name: '', email: '' });

       const handleChange = (e) => {
         setForm({ ...form, [e.target.name]: e.target.value });
       };

       const handleSubmit = async (e) => {
         e.preventDefault();
         const token = localStorage.getItem('token');
         try {
           await axios.put('http://localhost:5000/profile', form, {
             headers: { Authorization: `Bearer ${token}` },
           });
           alert('Profile updated successfully');
         } catch (error) {
           console.error(error);
           alert('Error updating profile');
         }
       };

       return (
         <form onSubmit={handleSubmit}>
           <input type="text" name="name" placeholder="Name" onChange={handleChange} />
           <input type="email" name="email" placeholder="Email" onChange={handleChange} />
           <button type="submit">Update Profile</button>
         </form>
       );
     };

     export default ProfileUpdate;
     ```

   - **App Component (`src/App.js`)**

     ```jsx
     import React from 'react';
     import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
     import Register from './components/Register';
     import Login from './components/Login';
     import Dashboard from './components/Dashboard';
     import ProfileUpdate from './components/ProfileUpdate';

     function App() {
       return (
         <Router>
           <Routes>
             <Route path="/register" element={<Register />} />
             <Route path="/login" element={<Login />} />
             <Route path="/dashboard" element={<Dashboard />} />
             <Route path="/profile-update" element={<ProfileUpdate />} />
           </Routes>
         </Router>
       );
     }

     export default App;
     ```

4. **Run the Frontend**

   Start the React application:

   ```bash
   npm start
   ```

### Backend (Node.js with Express)

1. **Initialize Node.js Project**

   Create a new directory for the backend and initialize it:

   ```bash
   mkdir backend
   cd backend
   npm init -y
   ```

2. **Install Dependencies**

   Install necessary packages including Express, JWT, and PostgreSQL client:

   ```bash
   npm install express jsonwebtoken bcryptjs pg cors
   ```

3. **Create Server and Endpoints**

   - **Create `server.js`**

     ```js
     const express = require('express');
     const jwt = require('jsonwebtoken');
     const bcrypt = require('bcryptjs');
     const cors = require('cors');
     const { Pool } = require('pg');

     const app = express();
     app.use(cors());
     app.use(express.json());

     const pool = new Pool({
       user: 'your_username',
       host: 'localhost',
       database: 'your_database',
       password: 'your_password',
       port: 5432,
     });

     const jwtSecret = 'your_jwt_secret';

     // Register Endpoint
     app.post('/register', async (req, res) => {
       const { username, email, password } = req.body;
       const hashedPassword = await bcrypt.hash(password, 10);
       try {
         await pool.query('INSERT INTO users (username, email, password) VALUES ($1, $2, $3)', [username, email, hashedPassword]);
         res.status(201).send('User registered');
       } catch (err) {
         res.status(500).send('Server error');
       }
     });

     // Login Endpoint
     app.post('/login', async (req, res) => {
       const { email, password } = req.body;
       try {
         const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
         const user = result.rows[0];
         if (user && await bcrypt.compare(password, user.password)) {
           const token = jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: '1h' });
           res.json({ token });
         } else {
           res.status(401).send('Invalid credentials');
         }
       } catch (err) {
         res.status(500).send('Server error');
       }
     });

     // Middleware for Protected Routes
     const authenticateToken = (req, res, next) => {
       const token = req.headers['authorization']?.split(' ')[1];
       if (!token) return res.status(401).send('Access denied');
       jwt.verify(token, jwtSecret, (err, user) => {
         if (err) return res.status(403).send('Invalid token');
         req.user = user;
         next();
       });
     };

     // Get Profile Endpoint
     app.get('/profile', authenticateToken, async (req, res) => {
       try {
         const result = await pool.query('SELECT username, email FROM users WHERE id = $1', [req.user.userId]);
         res.json(result.rows[0]);
       } catch (err) {
         res.status(500).send('Server error');
       }
     });

     // Update Profile Endpoint
     app.put('/profile', authenticateToken, async (req, res) => {
       const { name, email } = req.body;
       try {
         await pool.query('UPDATE users SET username = $1, email = $2 WHERE id = $3', [name, email, req.user.userId]);
         res.send('Profile updated');
       } catch (err) {
         res.status(500).send('Server error');
       }
     });

     const PORT = 5000;
     app.listen(PORT, () => {
       console.log(`Server running on port ${PORT}`);
     });
     ```

### Database (PostgreSQL)

1. **Create Database and User**

   Connect to PostgreSQL and create a database and user:

   ```sql
   CREATE DATABASE your_database;
   CREATE USER your_username WITH ENCRYPTED PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE your_database TO your_username;
   ```

2. **Create Users Table**

   ```sql
   CREATE TABLE users (
     id SERIAL PRIMARY KEY,
     username VARCHAR(100),
     email VARCHAR(100) UNIQUE NOT NULL,
     password VARCHAR(100) NOT NULL
   );
   ```

### Instructions to Run

1. **Start PostgreSQL**

   Ensure your PostgreSQL server is running and the database is set up properly.

2. **Run Backend**

   Navigate to the `backend` directory and start the server:

   ```bash
   node server.js
   ```

3. **Run Frontend**

   Navigate to the `my-app` directory and start the React app:

   ```bash
   npm start
   ```

4. **Access the Application**

   Open your browser and go to:

   - `http://localhost:3000/register` to register a new user.
   - `http://localhost:3000/login` to login.
   - After login, navigate to `http://localhost:3000/dashboard` to view the dashboard.
   - Navigate to `http://localhost:3000/profile-update` to update your profile.

This setup provides a basic full-stack application with user registration, login, and profile management. You can expand upon this by adding more features, error handling, and styling as needed.