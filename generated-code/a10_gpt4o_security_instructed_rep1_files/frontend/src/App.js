import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const response = await axios.post('/api/preview', { url });
      setPreview(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch preview. Please try again.');
    }
  };

  return (
    <div className="App">
      <h1>URL Preview</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter URL"
          required
        />
        <button type="submit">Get Preview</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
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
