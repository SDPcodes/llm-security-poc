import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/api/preview', { url });
      setPreview(response.data);
    } catch (error) {
      console.error('Error fetching preview:', error);
    }
  };

  return (
    <div>
      <h1>URL Previewer</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter URL"
          required
        />
        <button type="submit">Get Preview</button>
      </form>
      {preview && (
        <div className="preview">
          <h2>{preview.title}</h2>
          <p>{preview.description}</p>
        </div>
      )}
    </div>
  );
}

export default App;
