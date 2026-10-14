import React, { useState, useEffect } from 'react';
import axios from 'axios';

function FileUploadPage() {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    const fetchFiles = async () => {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/files', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFiles(response.data);
    };
    fetchFiles();
  }, []);

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleFileUpload = async () => {
    const formData = new FormData();
    formData.append('file', selectedFile);

    const token = localStorage.getItem('token');
    await axios.post('http://localhost:5000/api/files', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${token}`
      }
    });

    setSelectedFile(null);
    const response = await axios.get('http://localhost:5000/api/files', {
      headers: { Authorization: `Bearer ${token}` }
    });
    setFiles(response.data);
  };

  const handleDownload = async (fileId) => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`http://localhost:5000/api/files/${fileId}/download`, {
      headers: { Authorization: `Bearer ${token}` },
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
      <h1>File Upload</h1>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleFileUpload} disabled={!selectedFile}>Upload</button>

      <h2>Your Files</h2>
      <ul>
        {files.map(file => (
          <li key={file.id}>
            {file.filename}
            <button onClick={() => handleDownload(file.id)}>Download</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default FileUploadPage;
