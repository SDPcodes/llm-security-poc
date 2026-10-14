import React, { useState, useEffect } from 'react';
import axios from 'axios';
import jwtDecode from 'jwt-decode';

function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [files, setFiles] = useState([]);
  const [file, setFile] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const decoded = jwtDecode(token);
      if (decoded.exp * 1000 > Date.now()) {
        setIsAuthenticated(true);
        fetchFiles();
      }
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/login', { username, password });
      localStorage.setItem('token', response.data.token);
      setIsAuthenticated(true);
      fetchFiles();
    } catch (error) {
      console.error('Login error', error);
    }
  };

  const fetchFiles = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/files', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFiles(response.data);
    } catch (error) {
      console.error('Fetch files error', error);
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('file', file);
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/files', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });
      fetchFiles();
    } catch (error) {
      console.error('File upload error', error);
    }
  };

  const handleFileDownload = async (fileId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/files/${fileId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'file');
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      console.error('File download error', error);
    }
  };

  return (
    <div className="container mt-5">
      {!isAuthenticated ? (
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Username</label>
            <input type="text" className="form-control" value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" className="form-control" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary">Login</button>
        </form>
      ) : (
        <div>
          <h2>Upload and Download Files</h2>
          <form onSubmit={handleFileUpload}>
            <div className="form-group">
              <input type="file" className="form-control-file" onChange={handleFileChange} required />
            </div>
            <button type="submit" className="btn btn-primary">Upload</button>
          </form>
          <ul className="list-group mt-3">
            {files.map(file => (
              <li key={file.id} className="list-group-item d-flex justify-content-between align-items-center">
                {file.filename}
                <button className="btn btn-secondary btn-sm" onClick={() => handleFileDownload(file.id)}>Download</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;
