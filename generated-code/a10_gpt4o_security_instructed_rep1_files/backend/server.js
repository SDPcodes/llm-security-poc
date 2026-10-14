require('dotenv').config();
const express = require('express');
const axios = require('axios');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const csrf = require('csurf');
const { Pool } = require('pg');
const validator = require('validator');

const app = express();
const pool = new Pool();

app.use(helmet());
app.use(express.json());
app.use(csrf({ cookie: true }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});

app.post('/api/preview', apiLimiter, async (req, res) => {
  const { url } = req.body;

  if (!validator.isURL(url)) {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  try {
    const response = await axios.get(url);
    const titleMatch = response.data.match(/<title>(.*?)<\/title>/);
    const title = titleMatch ? titleMatch[1] : 'No title found';
    const descriptionMatch = response.data.match(/<meta name="description" content="(.*?)"/);
    const description = descriptionMatch ? descriptionMatch[1] : 'No description found';

    await pool.query('INSERT INTO url_logs (url, title) VALUES ($1, $2)', [url, title]);

    res.json({ title, description });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch URL preview' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
