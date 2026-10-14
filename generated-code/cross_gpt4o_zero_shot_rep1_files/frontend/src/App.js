import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [files, setFiles] = useState([]);
  const [file, setFile] = useState(null);

  useEffect(() => {
    axios.get('/api/files', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    .then(response => setFiles(response.data))
    .catch(error => console.error('Error fetching files:', error));
  }, []);

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleUpload = () => {
    const formData = new FormData();
    formData.append('file', file);

    axios.post('/api/files', formData, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'multipart/form-data'
      }
    })
    .then(() => {
      alert('File uploaded successfully');
      setFile(null);
    })
    .catch(error => console.error('Error uploading file:', error));
  };

  const handleDownload = (fileId) => {
    axios.get(`/api/files/${fileId}/download`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      responseType: 'blob'
    })
    .then(response => {
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'file'); // or extract file name from response
      document.body.appendChild(link);
      link.click();
      link.remove();
    })
    .catch(error => console.error('Error downloading file:', error));
  };

  return (
    <div>
      <h1>File Upload</h1>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleUpload}>Upload</button>
      <h2>Your Files</h2>
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

export default App;
