const puppeteer = require('puppeteer');

async function scanDomXSS(baseUrl) {
  const testPayload = '<script>window.__xss_triggered = true</script>';
  const commonParams = ['q', 'query', 'search', 's', 'input', 'id'];

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  try {
    for (const param of commonParams) {
      const testUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${param}=${encodeURIComponent(testPayload)}`;

      await page.goto(testUrl, { waitUntil: 'networkidle2' });

      // Wait for the JS to possibly execute
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Evaluate for DOM execution
      const result = await page.evaluate(() => {
        return typeof window.__xss_triggered !== 'undefined';
      });

      if (result) {
        await browser.close();
        return [{
          type: 'DOM XSS',
          endpoint: testUrl,
          severity: 'High',
          description: `DOM-based XSS detected via parameter "${param}".`,
          recommendation: 'Avoid using untrusted data in DOM APIs like innerHTML. Use proper output encoding.',
          owasp_link: 'https://owasp.org/www-community/attacks/DOM_Based_XSS'
        }];
      }
    }

    await browser.close();
    return []; // No DOM XSS found
  } catch (error) {
    await browser.close();
    console.error(`DOM XSS scan failed for ${baseUrl}:`, error.message);
    return [];
  }
}

module.exports = scanDomXSS;
