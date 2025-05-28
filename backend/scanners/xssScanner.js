const axios = require('axios');
const { URL } = require('url');

// Common XSS payloads to test
const testPayloads = [
  `"><script>alert(1)</script>`,
  `'><svg/onload=alert(1)>`,
  `"><img src=x onerror=alert(1)>`
];

// Fallback param names if no query string is present
const commonParams = ['q', 'query', 'search', 's', 'input', 'id', 'term'];

async function scanXSS(targetUrl) {
  try {
    const urlObj = new URL(targetUrl);
    const baseParams = [...urlObj.searchParams];

    const vulnerabilities = new Set();

    const paramsToTest = baseParams.length > 0
      ? [...new Set(baseParams.map(([param]) => param))]
      : commonParams;

    for (const param of paramsToTest) {
      for (const payload of testPayloads) {
        const testUrl = new URL(targetUrl);
        testUrl.searchParams.set(param, payload);

        try {
          const response = await axios.get(testUrl.toString(), { timeout: 5000 });

          if (response.data && response.data.includes(payload)) {
            vulnerabilities.add(JSON.stringify({
              type: "XSS",
              endpoint: testUrl.pathname + testUrl.search,
              severity: "High",
              description: `Reflected XSS detected via parameter "${param}".`,
              recommendation: "Use proper input validation and output encoding.",
              owasp_link: "https://owasp.org/www-community/attacks/xss/"
            }));

            break; // Stop testing this param after finding a hit
          }
        } catch (err) {
          // Ignore network errors to continue testing others
          console.warn(`Failed to test ${testUrl.toString()}:`, err.message);
        }
      }
    }

    return [...vulnerabilities].map(v => JSON.parse(v));
  } catch (error) {
    console.error("XSS scanner error:", error.message);
    return [];
  }
}

module.exports = scanXSS;
