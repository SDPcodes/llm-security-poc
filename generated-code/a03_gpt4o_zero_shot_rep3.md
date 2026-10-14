```json
{
  "files": [
    {
      "path": "frontend/package.json",
      "content": "{\n  \"name\": \"frontend\",\n  \"version\": \"1.0.0\",\n  \"main\": \"index.js\",\n  \"dependencies\": {\n    \"axios\": \"^0.21.1\",\n    \"react\": \"^17.0.2\",\n    \"react-dom\": \"^17.0.2\",\n    \"react-scripts\": \"4.0.3\"\n  },\n  \"scripts\": {\n    \"start\": \"react-scripts start\",\n    \"build\": \"react-scripts build\",\n    \"test\": \"react-scripts test\",\n    \"eject\": \"react-scripts eject\"\n  },\n  \"eslintConfig\": {\n    \"extends\": [\n      \"react-app\",\n      \"react-app/jest\"\n    ]\n  },\n  \"browserslist\": {\n    \"production\": [\n      \">0.2%\",\n      \"not dead\",\n      \"not op_mini all\"\n    ],\n    \"development\": [\n      \"last 1 chrome version\",\n      \"last 1 firefox version\",\n      \"last 1 safari version\"\n    ]\n  }\n}"
    },
    {
      "path": "frontend/public/index.html",
      "content": "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n    <meta charset=\"UTF-8\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n    <title>Product Catalogue</title>\n</head>\n<body>\n    <div id=\"root\"></div>\n</body>\n</html>"
    },
    {
      "path": "frontend/src/index.js",
      "content": "import React from 'react';\nimport ReactDOM from 'react-dom';\nimport './index.css';\nimport App from './App';\n\nReactDOM.render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>,\n  document.getElementById('root')\n);"
    },
    {
      "path": "frontend/src/App.js",
      "content": "import React, { useState, useEffect } from 'react';\nimport axios from 'axios';\n\nfunction App() {\n  const [products, setProducts] = useState([]);\n  const [search, setSearch] = useState('');\n  const [name, setName] = useState('');\n  const [email, setEmail] = useState('');\n  const [message, setMessage] = useState('');\n\n  useEffect(() => {\n    if (search) {\n      axios.get(`/api/products?q=${search}`).then(response => {\n        setProducts(response.data);\n      });\n    }\n  }, [search]);\n\n  const handleContactSubmit = (e) => {\n    e.preventDefault();\n    axios.post('/api/contact', { name, email, message })\n      .then(response => {\n        alert('Message sent successfully');\n      })\n      .catch(error => {\n        alert('Failed to send message');\n      });\n  };\n\n  return (\n    <div>\n      <h1>Product Catalogue</h1>\n      <input \n        type=\"text\" \n        value={search} \n        onChange={e => setSearch(e.target.value)} \n        placeholder=\"Search for products...\" \n      />\n      <ul>\n        {products.map(product => (\n          <li key={product.id}>{product.name}</li>\n        ))}\n      </ul>\n\n      <h2>Contact Us</h2>\n      <form onSubmit={handleContactSubmit}>\n        <input \n          type=\"text\" \n          value={name} \n          onChange={e => setName(e.target.value)} \n          placeholder=\"Your Name\" \n          required \n        />\n        <input \n          type=\"email\" \n          value={email} \n          onChange={e => setEmail(e.target.value)} \n          placeholder=\"Your Email\" \n          required \n        />\n        <textarea \n          value={message} \n          onChange={e => setMessage(e.target.value)} \n          placeholder=\"Your Message\" \n          required \n        ></textarea>\n        <button type=\"submit\">Send Message</button>\n      </form>\n    </div>\n  );\n}\n\nexport default App;"
    },
    {
      "path": "backend/package.json",
      "content": "{\n  \"name\": \"backend\",\n  \"version\": \"1.0.0\",\n  \"main\": \"server.js\",\n  \"dependencies\": {\n    \"express\": \"^4.17.1\",\n    \"pg\": \"^8.6.0\",\n    \"body-parser\": \"^1.19.0\",\n    \"cors\": \"^2.8.5\"\n  },\n  \"scripts\": {\n    \"start\": \"node server.js\"\n  }\n}"
    },
    {
      "path": "backend/server.js",
      "content": "const express = require('express');\nconst bodyParser = require('body-parser');\nconst cors = require('cors');\nconst { Pool } = require('pg');\n\nconst app = express();\nconst port = 5000;\n\nconst pool = new Pool({\n  user: 'yourusername',\n  host: 'localhost',\n  database: 'yourdatabase',\n  password: 'yourpassword',\n  port: 5432,\n});\n\napp.use(cors());\napp.use(bodyParser.json());\n\napp.get('/api/products', async (req, res) => {\n  const searchTerm = req.query.q;\n  try {\n    const result = await pool.query('SELECT * FROM products WHERE name ILIKE $1', [`%${searchTerm}%`]);\n    res.json(result.rows);\n  } catch (err) {\n    res.status(500).json({ error: 'Database error' });\n  }\n});\n\napp.post('/api/contact', async (req, res) => {\n  const { name, email, message } = req.body;\n  try {\n    await pool.query('INSERT INTO messages (name, email, message) VALUES ($1, $2, $3)', [name, email, message]);\n    res.status(201).send('Message stored');\n  } catch (err) {\n    res.status(500).json({ error: 'Database error' });\n  }\n});\n\napp.listen(port, () => {\n  console.log(`Server running on http://localhost:${port}`);\n});"
    },
    {
      "path": "schema.sql",
      "content": "CREATE TABLE products (\n  id SERIAL PRIMARY KEY,\n  name VARCHAR(255) NOT NULL\n);\n\nCREATE TABLE messages (\n  id SERIAL PRIMARY KEY,\n  name VARCHAR(255) NOT NULL,\n  email VARCHAR(255) NOT NULL,\n  message TEXT NOT NULL\n);\n\n-- Insert sample data into products\nINSERT INTO products (name) VALUES ('Product 1'), ('Product 2'), ('Product 3');"
    }
  ]
}
```