import React, { useState, useEffect } from 'react';
import { Route, Switch, useHistory } from 'react-router-dom';
import axios from 'axios';
import LoginPage from './components/LoginPage';
import ProjectsDashboard from './components/ProjectsDashboard';

function App() {
  const [user, setUser] = useState(null);
  const history = useHistory();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.get('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(response => setUser(response.data))
        .catch(() => localStorage.removeItem('token'));
    }
  }, []);

  const handleLogin = (email, password) => {
    axios.post('/api/auth/login', { email, password })
      .then(response => {
        localStorage.setItem('token', response.data.token);
        setUser(response.data.user);
        history.push('/projects');
      })
      .catch(error => console.error('Login failed', error));
  };

  return (
    <div>
      <Switch>
        <Route path="/login">
          <LoginPage onLogin={handleLogin} />
        </Route>
        <Route path="/projects">
          <ProjectsDashboard user={user} />
        </Route>
      </Switch>
    </div>
  );
}

export default App;
