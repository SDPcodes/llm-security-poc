import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [file, setFile] = useState(null);
  const [files, setFiles] = useState([]);

  const login = async () => {
    try {
      const response = await axios.post('/api/login', { username, password }, { withCredentials: true });
      alert('Login successful');
    } catch (error) {
      alert('Login failed');
    }
  };

  const uploadFile = async () => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      await axios.post('/api/files', formData, { withCredentials: true });
      alert('File uploaded');
    } catch (error) {
      alert('Upload failed');
    }
  };

  const listFiles = async () => {
    try {
      const response = await axios.get('/api/files', { withCredentials: true });
      setFiles(response.data);
    } catch (error) {
      alert('Failed to fetch files');
    }
  };

  return (
    <div>
      <h1>Login</h1>
      <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
      <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
      <button onClick={login}>Login</button>

      <h2>Upload File</h2>
      <input type="file" onChange={e => setFile(e.target.files[0])} />
      <button onClick={uploadFile}>Upload</button>

      <h2>Files</h2>
      <button onClick={listFiles}>List Files</button>
      <ul>
        {files.map(file => (
          <li key={file.id}><a href={`/api/files/${file.id}/download`} target="_blank" rel="noopener noreferrer">{file.name}</a></li>
        ))}
      </ul>
    </div>
  );
}

export default App;
