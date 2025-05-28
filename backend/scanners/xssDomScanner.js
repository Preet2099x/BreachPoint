const puppeteer = require('puppeteer');
const { URL } = require('url');

async function scanDomXSS(baseUrl) {
  const testPayload = '<script>window.__xss_triggered = true</script>';
  const commonParams = ['q', 'query', 'search', 's', 'input', 'id'];

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  try {
    const urlObj = new URL(baseUrl);
    let paramsToTest = [];

    if ([...urlObj.searchParams].length > 0) {
      // Use existing params in URL
      paramsToTest = [...urlObj.searchParams.keys()];
    } else {
      // No params present, fallback to common params
      paramsToTest = commonParams;
    }

    for (const param of paramsToTest) {
      // Create a copy of URL and set current param to payload
      const testUrlObj = new URL(baseUrl);
      testUrlObj.searchParams.set(param, testPayload);

      const testUrl = testUrlObj.toString();

      await page.goto(testUrl, { waitUntil: 'networkidle2' });

      // Wait for potential JS execution
      await new Promise(resolve => setTimeout(resolve, 3000));

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
