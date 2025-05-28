const express = require('express');
const router = express.Router();
const scanXSS = require('../scanners/xssScanner');
const scanDomXSS = require('../scanners/xssDomScanner');
const { crawlSite } = require('../utils/crawler');

router.post('/', async (req, res) => {
  const { url } = req.body;

  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: 'Invalid or missing URL' });
  }

  try {
    const discoveredUrls = await crawlSite(url);

    // Ensure the base URL is included
    if (!discoveredUrls.includes(url)) {
      discoveredUrls.unshift(url);
    }

    let allVulnerabilities = [];

    // Scan each discovered URL
    for (const link of discoveredUrls) {
      try {
        const [reflected, domBased] = await Promise.all([
          scanXSS(link),
          scanDomXSS(link)
        ]);

        allVulnerabilities.push(...reflected, ...domBased);
      } catch (scanError) {
        console.warn(`Scan failed for ${link}:`, scanError.message);
      }
    }

    // Remove duplicates based on endpoint + type
    const seen = new Set();
    const uniqueVulnerabilities = allVulnerabilities.filter(vuln => {
      const key = `${vuln.endpoint}_${vuln.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    res.json({
      url,
      scanned_at: new Date().toISOString(),
      vulnerabilities: uniqueVulnerabilities
    });
  } catch (error) {
    console.error('Crawler or scanning error:', error.message);
    res.status(500).json({ error: 'Scan failed' });
  }
});

module.exports = router;
