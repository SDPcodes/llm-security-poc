import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setPreview(null);
    try {
      const response = await axios.post('/api/preview', { url });
      setPreview(response.data);
    } catch (err) {
      setError('Failed to fetch preview');
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
        <button type="submit">Preview</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {preview && (
        <div>
          <h2>{preview.title}</h2>
          <p>{preview.description}</p>
        </div>
      )}
    </div>
  );
}

export default App;
