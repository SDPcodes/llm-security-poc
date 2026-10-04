const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const routes = require('./routes');
require('dotenv').config();

const app = express();

app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use(routes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
