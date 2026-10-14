```json
{
  "files": [
    {
      "path": "frontend/package.json",
      "content": "{\n  \"name\": \"url-preview-frontend\",\n  \"version\": \"1.0.0\",\n  \"main\": \"src/index.js\",\n  \"dependencies\": {\n    \"react\": \"^18.2.0\",\n    \"react-dom\": \"^18.2.0\",\n    \"axios\": \"^0.27.2\"\n  },\n  \"devDependencies\": {\n    \"@babel/core\": \"^7.18.10\",\n    \"@babel/preset-env\": \"^7.18.10\",\n    \"@babel/preset-react\": \"^7.18.6\",\n    \"webpack\": \"^5.73.0\",\n    \"webpack-cli\": \"^4.10.0\",\n    \"webpack-dev-server\": \"^4.9.3\"\n  },\n  \"scripts\": {\n    \"start\": \"webpack serve --mode development --open\",\n    \"build\": \"webpack --mode production\"\n  }\n}"
    },
    {
      "path": "frontend/public/index.html",
      "content": "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n    <meta charset=\"UTF-8\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n    <title>URL Preview</title>\n</head>\n<body>\n    <div id=\"root\"></div>\n    <script src=\"/bundle.js\"></script>\n</body>\n</html>"
    },
    {
      "path": "frontend/src/index.js",
      "content": "import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\n\nconst root = ReactDOM.createRoot(document.getElementById('root'));\nroot.render(<React.StrictMode><App /></React.StrictMode>);"
    },
    {
      "path": "frontend/src/App.js",
      "content": "import React, { useState } from 'react';\nimport axios from 'axios';\n\nfunction App() {\n  const [url, setUrl] = useState('');\n  const [preview, setPreview] = useState(null);\n\n  const handleSubmit = async (e) => {\n    e.preventDefault();\n    try {\n      const response = await axios.post('http://localhost:5000/api/preview', { url });\n      setPreview(response.data);\n    } catch (error) {\n      console.error('Error fetching preview:', error);\n    }\n  };\n\n  return (\n    <div>\n      <h1>URL Previewer</h1>\n      <form onSubmit={handleSubmit}>\n        <input\n          type=\"text\"\n          value={url}\n          onChange={(e) => setUrl(e.target.value)}\n          placeholder=\"Enter URL\"\n          required\n        />\n        <button type=\"submit\">Get Preview</button>\n      </form>\n      {preview && (\n        <div className=\"preview\">\n          <h2>{preview.title}</h2>\n          <p>{preview.description}</p>\n        </div>\n      )}\n    </div>\n  );\n}\n\nexport default App;"
    },
    {
      "path": "backend/package.json",
      "content": "{\n  \"name\": \"url-preview-backend\",\n  \"version\": \"1.0.0\",\n  \"main\": \"server.js\",\n  \"dependencies\": {\n    \"express\": \"^4.18.1\",\n    \"axios\": \"^0.27.2\",\n    \"pg\": \"^8.6.0\",\n    \"cors\": \"^2.8.5\"\n  },\n  \"scripts\": {\n    \"start\": \"node server.js\"\n  }\n}"
    },
    {
      "path": "backend/server.js",
      "content": "const express = require('express');\nconst axios = require('axios');\nconst cors = require('cors');\nconst { Pool } = require('pg');\n\nconst app = express();\nconst pool = new Pool({\n  connectionString: 'postgresql://username:password@localhost:5432/urlpreview'\n});\n\napp.use(cors());\napp.use(express.json());\n\napp.post('/api/preview', async (req, res) => {\n  const { url } = req.body;\n  try {\n    const response = await axios.get(url);\n    const html = response.data;\n\n    const titleMatch = html.match(/<title>(.*?)<\\/title>/);\n    const title = titleMatch ? titleMatch[1] : 'No title available';\n\n    const descriptionMatch = html.match(/<meta name=\"description\" content=\"(.*?)\"/);\n    const description = descriptionMatch ? descriptionMatch[1] : 'No description available';\n\n    await pool.query(\n      'INSERT INTO url_logs (url, title) VALUES ($1, $2)',\n      [url, title]\n    );\n\n    res.json({ title, description });\n  } catch (error) {\n    console.error(error);\n    res.status(500).json({ message: 'Error fetching the URL' });\n  }\n});\n\nconst PORT = process.env.PORT || 5000;\napp.listen(PORT, () => {\n  console.log(`Server running on port ${PORT}`);\n});"
    },
    {
      "path": "schema.sql",
      "content": "CREATE TABLE url_logs (\n  id SERIAL PRIMARY KEY,\n  url TEXT NOT NULL,\n  title TEXT,\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);\n"
    }
  ]
}
```