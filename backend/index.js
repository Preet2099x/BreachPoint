// index.js
const express = require('express');
const cors = require('cors');
const scanRouter = require('./routes/scan');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/scan', scanRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
