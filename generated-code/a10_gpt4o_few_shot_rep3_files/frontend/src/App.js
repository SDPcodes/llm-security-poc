import React, { useState } from 'react';
import './App.css';

function App() {
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();
      setPreview(data);
    } catch (error) {
      console.error('Error fetching URL preview:', error);
    }
  };

  return (
    <div className="App">
      <h1>URL Preview</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Enter URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button type="submit">Preview</button>
      </form>
      {preview && (
        <div className="preview-card">
          <h2>{preview.title}</h2>
          <p>{preview.description}</p>
        </div>
      )}
    </div>
  );
}

export default App;
