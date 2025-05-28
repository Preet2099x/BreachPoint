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

    // Use existing params or fallback common params
    const paramsToTest = baseParams.length > 0
      ? [...new Set(baseParams.map(([param]) => param))]
      : commonParams;

    for (const param of paramsToTest) {
      for (const payload of testPayloads) {
        const testUrl = new URL(targetUrl);
        testUrl.searchParams.set(param, payload);

        try {
          const response = await axios.get(testUrl.toString(), {
            timeout: 5000,
            headers: {
              'User-Agent': 'BreachPointScanner/1.0'
            }
          });

          if (response.data && response.data.includes(payload)) {
            // Use JSON.stringify on object for Set uniqueness
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
          // Log and continue testing other params/payloads
          console.warn(`Failed to test ${testUrl.toString()}:`, err.message);
        }

        // Optional delay to reduce server load, uncomment if needed
        // await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // Return array of parsed vulnerability objects
    return [...vulnerabilities].map(v => JSON.parse(v));
  } catch (error) {
    console.error("XSS scanner error:", error.message);
    return [];
  }
}

module.exports = scanXSS;
