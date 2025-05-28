import React, { useState } from 'react';
import axios from 'axios';

export default function ScanForm() {
  const [url, setUrl] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setReport(null);

    try {
      const response = await axios.post('http://localhost:5000/scan', { url });
      setReport(response.data);
    } catch (err) {
      setError('Scan failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Security Scan Tool</h1>

      <form onSubmit={handleSubmit} className="mb-6">
        <input
          type="text"
          placeholder="Enter URL to scan"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="border p-2 w-full"
          required
        />
        <button type="submit" className="mt-2 bg-blue-600 text-white px-4 py-2 rounded">
          {loading ? 'Scanning...' : 'Start Scan'}
        </button>
      </form>

      {error && <p className="text-red-600">{error}</p>}

      {report && (
        <div>
          <h2 className="text-xl font-semibold mb-2">Scan Report for {report.url}</h2>
          <p className="mb-4">Scanned at: {new Date(report.scanned_at).toLocaleString()}</p>

          {report.vulnerabilities.length === 0 ? (
            <p className="text-green-600 font-semibold">No vulnerabilities found!</p>
          ) : (
            <div>
              {report.vulnerabilities.map((vuln, idx) => (
                <div
                  key={idx}
                  className={`p-4 mb-4 rounded border ${
                    vuln.severity === 'High'
                      ? 'bg-red-100 border-red-400'
                      : vuln.severity === 'Medium'
                      ? 'bg-yellow-100 border-yellow-400'
                      : 'bg-green-100 border-green-400'
                  }`}
                >
                  <h3 className="font-bold">{vuln.type} ({vuln.severity})</h3>
                  <p><strong>Endpoint:</strong> {vuln.endpoint}</p>
                  <p>{vuln.description}</p>
                  <p><strong>Fix:</strong> {vuln.recommendation}</p>
                  <a href={vuln.owasp_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                    OWASP Reference
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
