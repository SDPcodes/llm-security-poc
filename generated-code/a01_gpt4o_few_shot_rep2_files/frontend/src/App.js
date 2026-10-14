import React, { useState } from 'react';
import axios from 'axios';
import Dashboard from './Dashboard';

function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/login', { email, password });
      setLoggedIn(true);
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  return (
    <div>
      {loggedIn ? (
        <Dashboard />
      ) : (
        <form onSubmit={handleLogin}>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
          <button type="submit">Login</button>
        </form>
      )}
    </div>
  );
}

export default App;
