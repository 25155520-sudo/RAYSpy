import { HttpsProxyAgent } from 'https-proxy-agent';
import http from 'http';
import https from 'https';

const PROXY = 'http://14.139.134.20:3128';
const agent = new HttpsProxyAgent(PROXY);

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/opensky/')) {
    proxyHttps(req, res, 'https://opensky-network.org' + req.url.replace(/^\/opensky/, ''));
  } else if (req.url.startsWith('/adsb-fi/')) {
    proxyHttps(
      req,
      res,
      'https://opendata.adsb.fi/api' + req.url.replace(/^\/adsb-fi/, '')
    );
  } else if (req.url.startsWith('/adsb/')) {
    proxyHttps(req, res, 'https://api.adsb.lol' + req.url.replace(/^\/adsb/, ''));
  } else if (req.url.startsWith('/celestrak/')) {
    proxyHttps(req, res, 'https://celestrak.org' + req.url.replace(/^\/celestrak/, ''));
  } else if (req.url.startsWith('/geocode/')) {
    proxyHttps(
      req,
      res,
      'https://nominatim.openstreetmap.org' + req.url.replace(/^\/geocode/, ''),
      { Referer: 'http://localhost:5173' }
    );
  } else if (req.url.startsWith('/austin-data/')) {
    proxyHttps(
      req,
      res,
      'https://data.austintexas.gov' + req.url.replace(/^\/austin-data/, '')
    );
  } else if (req.url.startsWith('/cctv/')) {
    proxyHttps(
      req,
      res,
      'https://cctv.austinmobility.io' + req.url.replace(/^\/cctv/, ''),
      { Referer: 'https://data.mobility.austin.gov/' }
    );
  } else if (req.url.startsWith('/openeagle/')) {
    proxyHttps(
      req,
      res,
      'https://raw.githubusercontent.com/stuchapin909/Open-Eagle-Eye/master' +
        req.url.replace(/^\/openeagle/, '')
    );
  } else if (req.url.startsWith('/cam-proxy')) {
    const parsed = new URL(req.url, 'http://localhost');
    const target = parsed.searchParams.get('url');
    if (!target || !/^https?:\/\//i.test(target)) {
      res.writeHead(400);
      res.end('Invalid camera url');
      return;
    }
    proxyHttps(req, res, target);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

function proxyHttps(req, res, targetUrl, extraHeaders = {}) {
  const parsed = new URL(targetUrl);
  const options = {
    hostname: parsed.hostname,
    port: 443,
    path: parsed.pathname + parsed.search,
    method: req.method,
    agent,
    headers: {
      'User-Agent': 'RAYSpy/1.0 (educational project)',
      ...extraHeaders,
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
}

const PORT = 5176;
server.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
