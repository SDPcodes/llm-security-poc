import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Switch, useHistory } from 'react-router-dom';
import axios from 'axios';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const history = useHistory();

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await axios.post('/api/login', { email, password });
      history.push('/dashboard');
    } catch (error) {
      console.error('Invalid credentials');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
      <button type="submit">Login</button>
    </form>
  );
}

function Dashboard() {
  const [files, setFiles] = useState([]);
  const [file, setFile] = useState(null);

  const fetchFiles = async () => {
    const response = await axios.get('/api/files');
    setFiles(response.data);
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    const formData = new FormData();
    formData.append('file', file);
    await axios.post('/api/files', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    fetchFiles();
  };

  const handleDownload = async (id) => {
    const response = await axios.get(`/api/files/${id}/download`, {
      responseType: 'blob'
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'file');
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div>
      <form onSubmit={handleUpload}>
        <input type="file" onChange={(e) => setFile(e.target.files[0])} required />
        <button type="submit">Upload</button>
      </form>
      <ul>
        {files.map(file => (
          <li key={file.id}>
            {file.name} <button onClick={() => handleDownload(file.id)}>Download</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Switch>
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/" component={Login} />
      </Switch>
    </Router>
  );
}

export default App;
