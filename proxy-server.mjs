import { HttpsProxyAgent } from 'https-proxy-agent';
import http from 'http';
import https from 'https';

const PROXY = 'http://14.139.134.20:3128';
const agent = new HttpsProxyAgent(PROXY);

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/geocode/')) {
    const target = 'https://nominatim.openstreetmap.org' + req.url.replace(/^\/geocode/, '');
    const parsed = new URL(target);
    const options = {
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname + parsed.search,
      method: req.method,
      agent,
      headers: {
        'User-Agent': 'RAYSpy/1.0 (educational project)',
        'Referer': 'http://localhost:5173',
      },
    };
    const proxyReq = https.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    proxyReq.on('error', (err) => {
      res.writeHead(502);
      res.end(JSON.stringify({ error: err.message }));
    });
    req.pipe(proxyReq);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

const PORT = 5176;
server.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
