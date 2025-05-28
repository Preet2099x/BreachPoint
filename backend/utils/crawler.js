const axios = require('axios');
const { JSDOM } = require('jsdom');
const { URL } = require('url');

async function crawlSite(baseUrl, maxDepth = 1) {
  const visited = new Set();
  const toVisit = [{ link: baseUrl, depth: 0 }];
  const discoveredUrls = new Set();

  while (toVisit.length > 0) {
    const { link, depth } = toVisit.shift();

    if (visited.has(link) || depth > maxDepth) continue;

    visited.add(link);
    discoveredUrls.add(link);

    try {
      const response = await axios.get(link);
      const dom = new JSDOM(response.data);
      const document = dom.window.document;

      const elements = [
        ...document.querySelectorAll('a[href]'),
        ...document.querySelectorAll('form[action]')
      ];

      for (const el of elements) {
        const href = el.getAttribute('href') || el.getAttribute('action');
        if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) continue;

        let normalizedUrl;
        try {
          normalizedUrl = new URL(href, link).toString();
        } catch {
          continue; // skip invalid URLs
        }

        if (
          normalizedUrl.startsWith(baseUrl) &&
          !visited.has(normalizedUrl)
        ) {
          toVisit.push({ link: normalizedUrl, depth: depth + 1 });
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch ${link}: ${error.message}`);
    }
  }

  return Array.from(discoveredUrls);
}

module.exports = { crawlSite };
