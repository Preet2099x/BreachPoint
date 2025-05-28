const axios = require('axios');
const { URL } = require('url');

// Common XSS payloads to test
const testPayloads = [
  `"><script>alert(1)</script>`,
  `'><svg/onload=alert(1)>`,
  `"><img src=x onerror=alert(1)>`
];

async function scanXSS(targetUrl) {
  try {
    const urlObj = new URL(targetUrl);

    // If no query parameters, add a dummy one for testing
    if ([...urlObj.searchParams].length === 0) {
      urlObj.searchParams.append('test', 'test');
    }

    const vulnerabilities = [];

    for (const [param] of urlObj.searchParams) {
      for (const payload of testPayloads) {
        // Clone URL and inject payload into one param
        const testUrl = new URL(urlObj.toString());
        testUrl.searchParams.set(param, payload);

        // Send GET request with payload
        const response = await axios.get(testUrl.toString(), { timeout: 5000 });

        // Check if payload reflected in response body
        if (response.data && response.data.includes(payload)) {
          vulnerabilities.push({
            type: "XSS",
            endpoint: testUrl.pathname + testUrl.search,
            severity: "High",
            description: `Reflected XSS detected via parameter "${param}".`,
            recommendation: "Use proper input validation and output encoding.",
            owasp_link: "https://owasp.org/www-community/attacks/xss/"
          });
          break; // Stop testing other payloads for this param
        }
      }
    }

    return vulnerabilities;
  } catch (error) {
    console.error("XSS scanner error:", error.message);
    return [];
  }
}

module.exports = scanXSS;
