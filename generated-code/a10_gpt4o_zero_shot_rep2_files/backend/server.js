const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const pool = new Pool({
  connectionString: 'postgresql://username:password@localhost:5432/urlpreview'
});

app.use(cors());
app.use(express.json());

app.post('/api/preview', async (req, res) => {
  const { url } = req.body;
  try {
    const response = await axios.get(url);
    const html = response.data;

    const titleMatch = html.match(/<title>(.*?)<\/title>/);
    const title = titleMatch ? titleMatch[1] : 'No title available';

    const descriptionMatch = html.match(/<meta name="description" content="(.*?)"/);
    const description = descriptionMatch ? descriptionMatch[1] : 'No description available';

    await pool.query(
      'INSERT INTO url_logs (url, title) VALUES ($1, $2)',
      [url, title]
    );

    res.json({ title, description });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching the URL' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
