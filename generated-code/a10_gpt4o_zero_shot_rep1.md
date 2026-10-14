```json
{
  "files": [
    {
      "path": "frontend/package.json",
      "content": "{\n  \"name\": \"url-preview-frontend\",\n  \"version\": \"1.0.0\",\n  \"private\": true,\n  \"dependencies\": {\n    \"react\": \"^18.0.0\",\n    \"react-dom\": \"^18.0.0\",\n    \"axios\": \"^0.27.2\"\n  },\n  \"scripts\": {\n    \"start\": \"react-scripts start\",\n    \"build\": \"react-scripts build\",\n    \"test\": \"react-scripts test\",\n    \"eject\": \"react-scripts eject\"\n  }\n}"
    },
    {
      "path": "frontend/public/index.html",
      "content": "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n    <meta charset=\"UTF-8\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n    <title>URL Preview</title>\n</head>\n<body>\n    <div id=\"root\"></div>\n</body>\n</html>"
    },
    {
      "path": "frontend/src/index.js",
      "content": "import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\n\nconst root = ReactDOM.createRoot(document.getElementById('root'));\nroot.render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);"
    },
    {
      "path": "frontend/src/App.js",
      "content": "import React, { useState } from 'react';\nimport axios from 'axios';\n\nfunction App() {\n  const [url, setUrl] = useState('');\n  const [preview, setPreview] = useState(null);\n\n  const fetchPreview = async () => {\n    try {\n      const response = await axios.post('http://localhost:5000/api/preview', { url });\n      setPreview(response.data);\n    } catch (error) {\n      console.error('Error fetching URL preview:', error);\n    }\n  };\n\n  return (\n    <div style={{ padding: '20px' }}>\n      <h1>URL Previewer</h1>\n      <input\n        type=\"text\"\n        value={url}\n        onChange={(e) => setUrl(e.target.value)}\n        placeholder=\"Enter URL\"\n        style={{ width: '300px' }}\n      />\n      <button onClick={fetchPreview}>Fetch Preview</button>\n      {preview && (\n        <div style={{ marginTop: '20px', border: '1px solid #ccc', padding: '10px' }}>\n          <h2>{preview.title}</h2>\n          <p>{preview.description}</p>\n        </div>\n      )}\n    </div>\n  );\n}\n\nexport default App;"
    },
    {
      "path": "backend/package.json",
      "content": "{\n  \"name\": \"url-preview-backend\",\n  \"version\": \"1.0.0\",\n  \"main\": \"server.js\",\n  \"dependencies\": {\n    \"express\": \"^4.18.1\",\n    \"pg\": \"^8.7.3\",\n    \"axios\": \"^0.27.2\",\n    \"cheerio\": \"^1.0.0-rc.10\"\n  },\n  \"scripts\": {\n    \"start\": \"node server.js\"\n  }\n}"
    },
    {
      "path": "backend/server.js",
      "content": "const express = require('express');\nconst axios = require('axios');\nconst cheerio = require('cheerio');\nconst { Pool } = require('pg');\n\nconst app = express();\napp.use(express.json());\n\nconst pool = new Pool({\n  user: 'postgres',\n  host: 'localhost',\n  database: 'url_preview',\n  password: 'password',\n  port: 5432,\n});\n\napp.post('/api/preview', async (req, res) => {\n  const { url } = req.body;\n  try {\n    const response = await axios.get(url);\n    const $ = cheerio.load(response.data);\n    const title = $('head > title').text();\n    const description = $('meta[name=\"description\"]').attr('content') || 'No description available';\n\n    await pool.query('INSERT INTO url_logs (url, title) VALUES ($1, $2)', [url, title]);\n\n    res.json({ title, description });\n  } catch (error) {\n    console.error('Error fetching URL:', error);\n    res.status(500).json({ error: 'Failed to fetch URL' });\n  }\n});\n\napp.listen(5000, () => {\n  console.log('Server is running on port 5000');\n});"
    },
    {
      "path": "schema.sql",
      "content": "CREATE TABLE IF NOT EXISTS url_logs (\n  id SERIAL PRIMARY KEY,\n  url TEXT NOT NULL,\n  title TEXT NOT NULL,\n  created_at TIMESTAMPTZ DEFAULT NOW()\n);"
    }
  ]
}
```