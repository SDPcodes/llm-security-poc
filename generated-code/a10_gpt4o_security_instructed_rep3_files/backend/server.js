require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const cors = require('cors');
const csrf = require('csurf');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 5000;
const csrfProtection = csrf({ cookie: true });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

app.use(helmet());
app.use(cors());
app.use(bodyParser.json());
app.use(csrfProtection);

app.post('/api/preview', async (req, res) => {
  const { url } = req.body;

  if (typeof url !== 'string' || !url.startsWith('http')) {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  try {
    const response = await axios.get(url);
    const titleMatch = response.data.match(/<title>(.*?)<\/title>/);
    const title = titleMatch ? titleMatch[1] : 'No title available';
    const descriptionMatch = response.data.match(/<meta name="description" content="(.*?)"/);
    const description = descriptionMatch ? descriptionMatch[1] : 'No description available';

    await pool.query(
      'INSERT INTO urls (url, title) VALUES ($1, $2)',
      [url, title]
    );

    res.json({ title, description });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch URL preview' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
