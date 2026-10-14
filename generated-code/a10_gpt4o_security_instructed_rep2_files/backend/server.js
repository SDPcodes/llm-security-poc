require('dotenv').config();
const express = require('express');
const axios = require('axios');
const helmet = require('helmet');
const cors = require('cors');
const csrf = require('csurf');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const validator = require('validator');

const app = express();
app.use(express.json());
app.use(helmet());
app.use(cors({ origin: 'http://localhost:3000' }));

const csrfProtection = csrf({ cookie: true });
app.use(csrfProtection);

const pool = new Pool();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

app.post('/api/preview', async (req, res) => {
  const { url } = req.body;

  if (!url || !validator.isURL(url)) {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  try {
    const response = await axios.get(url);
    const titleMatch = response.data.match(/<title>(.*?)<\/title>/i);
    const descriptionMatch = response.data.match(/<meta name="description" content="(.*?)"/i);

    const title = titleMatch ? titleMatch[1] : 'No title available';
    const description = descriptionMatch ? descriptionMatch[1] : 'No description available';

    await pool.query('INSERT INTO url_logs (url, title) VALUES ($1, $2)', [url, title]);

    res.json({ title, description });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch the URL' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
