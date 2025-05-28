const express = require('express');
const router = express.Router();
const scanXSS = require('../scanners/xssScanner');
const scanDomXSS = require('../scanners/xssDomScanner');
const { crawlSite } = require('../utils/crawler');

// Simple concurrency helper to limit parallel promises
async function asyncPool(poolLimit, array, iteratorFn) {
  const ret = [];
  const executing = new Set();

  for (const item of array) {
    const p = Promise.resolve().then(() => iteratorFn(item));
    ret.push(p);

    executing.add(p);
    const clean = () => executing.delete(p);
    p.then(clean).catch(clean);

    if (executing.size >= poolLimit) {
      await Promise.race(executing);
    }
  }
  return Promise.all(ret);
}

router.post('/', async (req, res) => {
  const { url } = req.body;

  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: 'Invalid or missing URL' });
  }

  try {
    const discoveredUrls = await crawlSite(url);

    if (!discoveredUrls.includes(url)) {
      discoveredUrls.unshift(url);
    }

    let allVulnerabilities = [];

    // Use concurrency limit, e.g., 5 URLs at a time
    const concurrencyLimit = 5;

    const scanResults = await asyncPool(concurrencyLimit, discoveredUrls, async (link) => {
      try {
        const [reflected, domBased] = await Promise.all([
          scanXSS(link),
          scanDomXSS(link)
        ]);
        return [...reflected, ...domBased];
      } catch (scanError) {
        console.warn(`Scan failed for ${link}:`, scanError.message);
        return [];
      }
    });

    // Flatten array of arrays into a single array
    allVulnerabilities = scanResults.flat();

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
