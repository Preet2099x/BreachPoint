const express = require('express');
const router = express.Router();
const scanXSS = require('../scanners/xssScanner');

router.post('/', async (req, res) => {
  const { url } = req.body;

  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: 'Invalid or missing URL' });
  }

  try {
    const vulnerabilities = await scanXSS(url);

    res.json({
      url,
      scanned_at: new Date().toISOString(),
      vulnerabilities
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Scan failed' });
  }
});

module.exports = router;
