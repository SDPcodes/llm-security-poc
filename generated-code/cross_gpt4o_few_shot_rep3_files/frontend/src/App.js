import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [files, setFiles] = useState([]);

  const handleLogin = async () => {
    try {
      const response = await axios.post('/api/login', { email, password });
      setToken(response.data.token);
    } catch (error) {
      console.error('Login failed', error);
    }
  };

  const fetchFiles = async () => {
    try {
      const response = await axios.get('/api/files', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFiles(response.data.files);
    } catch (error) {
      console.error('Failed to fetch files', error);
    }
  };

  const uploadFile = async (event) => {
    event.preventDefault();
    const file = event.target.elements.file.files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post('/api/files', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });
      fetchFiles();
    } catch (error) {
      console.error('File upload failed', error);
    }
  };

  return (
    <div>
      <h1>Login</h1>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
      <button onClick={handleLogin}>Login</button>

      {token && (
        <div>
          <h2>Upload File</h2>
          <form onSubmit={uploadFile}>
            <input type="file" name="file" />
            <button type="submit">Upload</button>
          </form>

          <h2>Your Files</h2>
          <ul>
            {files.map(file => (
              <li key={file.id}>
                <a href={`/api/files/${file.id}/download`}>{file.filename}</a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;
