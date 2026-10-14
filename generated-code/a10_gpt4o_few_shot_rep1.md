```json
{
  "files": [
    {
      "path": "frontend/package.json",
      "content": "{\n  \"name\": \"url-preview-app\",\n  \"version\": \"1.0.0\",\n  \"private\": true,\n  \"dependencies\": {\n    \"react\": \"^18.2.0\",\n    \"react-dom\": \"^18.2.0\",\n    \"axios\": \"^1.3.4\"\n  },\n  \"scripts\": {\n    \"start\": \"react-scripts start\",\n    \"build\": \"react-scripts build\"\n  }\n}"
    },
    {
      "path": "frontend/public/index.html",
      "content": "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n    <meta charset=\"UTF-8\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n    <title>URL Preview App</title>\n</head>\n<body>\n    <div id=\"root\"></div>\n</body>\n</html>"
    },
    {
      "path": "frontend/src/index.js",
      "content": "import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\n\nconst root = ReactDOM.createRoot(document.getElementById('root'));\nroot.render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);"
    },
    {
      "path": "frontend/src/App.js",
      "content": "import React, { useState } from 'react';\nimport axios from 'axios';\n\nfunction App() {\n  const [url, setUrl] = useState('');\n  const [preview, setPreview] = useState(null);\n  const [error, setError] = useState('');\n\n  const fetchPreview = async () => {\n    try {\n      const response = await axios.post('/api/preview', { url });\n      setPreview(response.data);\n      setError('');\n    } catch (err) {\n      setPreview(null);\n      setError('Error fetching preview');\n    }\n  };\n\n  return (\n    <div className=\"App\">\n      <h1>URL Preview</h1>\n      <input\n        type=\"text\"\n        value={url}\n        onChange={(e) => setUrl(e.target.value)}\n        placeholder=\"Enter URL\"\n      />\n      <button onClick={fetchPreview}>Fetch Preview</button>\n      {error && <p style={{ color: 'red' }}>{error}</p>}\n      {preview && (\n        <div className=\"preview\">\n          <h2>{preview.title}</h2>\n          <p>{preview.description}</p>\n        </div>\n      )}\n    </div>\n  );\n}\n\nexport default App;"
    },
    {
      "path": "backend/package.json",
      "content": "{\n  \"name\": \"url-preview-backend\",\n  \"version\": \"1.0.0\",\n  \"main\": \"server.js\",\n  \"dependencies\": {\n    \"express\": \"^4.18.2\",\n    \"pg\": \"^8.8.0\",\n    \"axios\": \"^1.3.4\"\n  },\n  \"scripts\": {\n    \"start\": \"node server.js\"\n  }\n}"
    },
    {
      "path": "backend/server.js",
      "content": "const express = require('express');\nconst axios = require('axios');\nconst { Pool } = require('pg');\nconst app = express();\nconst port = process.env.PORT || 3001;\n\napp.use(express.json());\n\nconst pool = new Pool({\n  connectionString: process.env.DATABASE_URL\n});\n\napp.post('/api/preview', async (req, res) => {\n  const { url } = req.body;\n  if (!url) return res.status(400).json({ error: 'URL is required' });\n  try {\n    const response = await axios.get(url);\n    const html = response.data;\n    const titleMatch = html.match(/<title>([^<]*)<\\/title>/i);\n    const descriptionMatch = html.match(/<meta name=\"description\" content=\"([^<]*)\"/i);\n    const title = titleMatch ? titleMatch[1] : 'No title found';\n    const description = descriptionMatch ? descriptionMatch[1] : 'No description found';\n\n    await pool.query(\n      'INSERT INTO url_logs (url, title) VALUES ($1, $2)',\n      [url, title]\n    );\n\n    res.json({ title, description });\n  } catch (error) {\n    res.status(500).json({ error: 'Failed to fetch the URL' });\n  }\n});\n\napp.listen(port, () => {\n  console.log(`Server running on port ${port}`);\n});"
    },
    {
      "path": "schema.sql",
      "content": "CREATE TABLE url_logs (\n  id SERIAL PRIMARY KEY,\n  url TEXT NOT NULL,\n  title TEXT NOT NULL,\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);"
    }
  ]
}
```