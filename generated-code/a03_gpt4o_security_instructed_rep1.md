```json
{
  "files": [
    {
      "path": "frontend/package.json",
      "content": "{\n  \"name\": \"product-catalogue\",\n  \"version\": \"1.0.0\",\n  \"private\": true,\n  \"dependencies\": {\n    \"axios\": \"^0.27.2\",\n    \"react\": \"^18.0.0\",\n    \"react-dom\": \"^18.0.0\",\n    \"react-scripts\": \"5.0.0\"\n  },\n  \"scripts\": {\n    \"start\": \"react-scripts start\",\n    \"build\": \"react-scripts build\",\n    \"test\": \"react-scripts test\",\n    \"eject\": \"react-scripts eject\"\n  },\n  \"eslintConfig\": {\n    \"extends\": [\"react-app\", \"react-app/jest\"]\n  },\n  \"browserslist\": {\n    \"production\": [\">0.2%\", \"not dead\", \"not op_mini all\"],\n    \"development\": [\n      \"last 1 chrome version\",\n      \"last 1 firefox version\",\n      \"last 1 safari version\"\n    ]\n  }\n}"
    },
    {
      "path": "frontend/public/index.html",
      "content": "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>Product Catalogue</title>\n</head>\n<body>\n  <div id=\"root\"></div>\n</body>\n</html>"
    },
    {
      "path": "frontend/src/index.js",
      "content": "import React from 'react';\nimport ReactDOM from 'react-dom';\nimport './index.css';\nimport App from './App';\n\nReactDOM.render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>,\n  document.getElementById('root')\n);"
    },
    {
      "path": "frontend/src/App.js",
      "content": "import React, { useState, useEffect } from 'react';\nimport axios from 'axios';\n\nfunction App() {\n  const [products, setProducts] = useState([]);\n  const [query, setQuery] = useState('');\n  const [name, setName] = useState('');\n  const [email, setEmail] = useState('');\n  const [message, setMessage] = useState('');\n\n  useEffect(() => {\n    if (query) {\n      axios.get(`/api/products?q=${encodeURIComponent(query)}`)\n        .then(response => setProducts(response.data))\n        .catch(err => console.error(err));\n    }\n  }, [query]);\n\n  const handleContactSubmit = (e) => {\n    e.preventDefault();\n    axios.post('/api/contact', { name, email, message })\n      .then(() => {\n        setName('');\n        setEmail('');\n        setMessage('');\n        alert('Message sent!');\n      })\n      .catch(err => console.error(err));\n  };\n\n  return (\n    <div>\n      <h1>Product Catalogue</h1>\n      <input \n        type=\"text\" \n        placeholder=\"Search products\" \n        value={query} \n        onChange={e => setQuery(e.target.value)} \n      />\n      <ul>\n        {products.map(product => (\n          <li key={product.id}>{product.name}</li>\n        ))}\n      </ul>\n      <h2>Contact Us</h2>\n      <form onSubmit={handleContactSubmit}>\n        <input \n          type=\"text\" \n          placeholder=\"Name\" \n          value={name} \n          onChange={e => setName(e.target.value)} \n          required\n        />\n        <input \n          type=\"email\" \n          placeholder=\"Email\" \n          value={email} \n          onChange={e => setEmail(e.target.value)} \n          required\n        />\n        <textarea \n          placeholder=\"Message\" \n          value={message} \n          onChange={e => setMessage(e.target.value)} \n          required\n        />\n        <button type=\"submit\">Send</button>\n      </form>\n    </div>\n  );\n}\n\nexport default App;"
    },
    {
      "path": "backend/package.json",
      "content": "{\n  \"name\": \"backend\",\n  \"version\": \"1.0.0\",\n  \"main\": \"server.js\",\n  \"scripts\": {\n    \"start\": \"node server.js\"\n  },\n  \"dependencies\": {\n    \"bcrypt\": \"^5.0.1\",\n    \"cors\": \"^2.8.5\",\n    \"csurf\": \"^1.11.0\",\n    \"dotenv\": \"^10.0.0\",\n    \"express\": \"^4.17.1\",\n    \"express-rate-limit\": \"^5.5.1\",\n    \"helmet\": \"^4.6.0\",\n    \"jsonwebtoken\": \"^8.5.1\",\n    \"pg\": \"^8.7.1\",\n    \"validator\": \"^13.6.0\"\n  }\n}"
    },
    {
      "path": "backend/server.js",
      "content": "require('dotenv').config();\nconst express = require('express');\nconst helmet = require('helmet');\nconst cors = require('cors');\nconst rateLimit = require('express-rate-limit');\nconst csrf = require('csurf');\nconst { Pool } = require('pg');\nconst validator = require('validator');\nconst jwt = require('jsonwebtoken');\n\nconst app = express();\nconst port = process.env.PORT || 3001;\n\napp.use(helmet());\napp.use(cors({ origin: 'http://localhost:3000', credentials: true }));\napp.use(express.json());\n\nconst csrfProtection = csrf({ cookie: true });\n\nconst pool = new Pool();\n\nconst apiLimiter = rateLimit({\n  windowMs: 15 * 60 * 1000, // 15 minutes\n  max: 100 // Limit each IP to 100 requests per windowMs\n});\n\napp.get('/api/products', async (req, res) => {\n  const { q } = req.query;\n  if (!validator.isAlphanumeric(q)) {\n    return res.status(400).send('Invalid search query');\n  }\n  try {\n    const result = await pool.query('SELECT * FROM products WHERE name ILIKE $1', [`%${q}%`]);\n    res.json(result.rows);\n  } catch (error) {\n    console.error(error);\n    res.status(500).send('Server Error');\n  }\n});\n\napp.post('/api/contact', csrfProtection, async (req, res) => {\n  const { name, email, message } = req.body;\n  if (!validator.isEmail(email) || !validator.isLength(name, { min: 1 }) || !validator.isLength(message, { min: 1 })) {\n    return res.status(400).send('Invalid input');\n  }\n  try {\n    await pool.query('INSERT INTO messages (name, email, message) VALUES ($1, $2, $3)', [name, email, message]);\n    res.status(201).send('Message stored');\n  } catch (error) {\n    console.error(error);\n    res.status(500).send('Server Error');\n  }\n});\n\napp.listen(port, () => {\n  console.log(`Server running on port ${port}`);\n});"
    },
    {
      "path": "schema.sql",
      "content": "CREATE TABLE products (\n  id SERIAL PRIMARY KEY,\n  name VARCHAR(255) NOT NULL\n);\n\nCREATE TABLE messages (\n  id SERIAL PRIMARY KEY,\n  name VARCHAR(255) NOT NULL,\n  email VARCHAR(255) NOT NULL,\n  message TEXT NOT NULL\n);\n"
    }
  ]
}
```