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

      // Collect all anchor hrefs
      const anchors = [...document.querySelectorAll('a[href]')];
      // Collect all forms
      const forms = [...document.querySelectorAll('form[action]')];

      // Process anchors
      for (const anchor of anchors) {
        const href = anchor.getAttribute('href');
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

      // Process forms (simulate GET submission)
      for (const form of forms) {
        const action = form.getAttribute('action') || link;
        let method = (form.getAttribute('method') || 'GET').toUpperCase();

        if (method !== 'GET') {
          // Skip non-GET forms for now to keep crawler simple
          continue;
        }

        let formUrl;
        try {
          formUrl = new URL(action, link);
        } catch {
          continue;
        }

        // Collect input names and assign test values
        const inputs = [...form.querySelectorAll('input[name], select[name], textarea[name]')];
        for (const input of inputs) {
          // Use a simple test value
          formUrl.searchParams.set(input.getAttribute('name'), 'test');
        }

        const formLink = formUrl.toString();
        if (
          formLink.startsWith(baseUrl) &&
          !visited.has(formLink)
        ) {
          toVisit.push({ link: formLink, depth: depth + 1 });
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch ${link}: ${error.message}`);
    }
  }

  return Array.from(discoveredUrls);
}

module.exports = { crawlSite };
