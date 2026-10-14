import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Dashboard() {
  const [files, setFiles] = useState([]);
  const [file, setFile] = useState(null);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await axios.get('/api/files');
        setFiles(response.data);
      } catch (error) {
        console.error('Error fetching files', error);
      }
    };
    fetchFiles();
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('file', file);
    try {
      await axios.post('/api/files', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      alert('File uploaded successfully');
    } catch (error) {
      console.error('Error uploading file', error);
    }
  };

  return (
    <div>
      <h2>File Dashboard</h2>
      <form onSubmit={handleUpload}>
        <input type="file" onChange={(e) => setFile(e.target.files[0])} required />
        <button type="submit">Upload</button>
      </form>
      <h3>Your Files</h3>
      <ul>
        {files.map((file) => (
          <li key={file.id}>
            {file.name} - <a href={`/api/files/${file.id}/download`}>Download</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Dashboard;
