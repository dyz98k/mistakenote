require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3000;
const BACKEND_HOST = process.env.BACKEND_HOST || 'localhost';
const BACKEND_PORT = process.env.BACKEND_PORT || '8080';

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) { fs.mkdirSync(uploadDir, { recursive: true }); }

const storage = multer.diskStorage({
  destination: (req, file, cb) => { cb(null, uploadDir); },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.random().toString(36).substr(2, 9) + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) { cb(null, true); }
    else { cb(new Error('只允许上传图片')); }
  }
});

app.use(cors());
app.use('/uploads', express.static(uploadDir));

app.use('/api', (req, res) => {
  const headers = { ...req.headers };
  delete headers.host;
  headers['host'] = `${BACKEND_HOST}:${BACKEND_PORT}`;
  headers['Accept-Encoding'] = 'identity';

  const options = {
    hostname: BACKEND_HOST,
    port: parseInt(BACKEND_PORT, 10),
    path: req.originalUrl,
    method: req.method,
    headers: headers
  };

  const proxyReq = http.request(options, (proxyRes) => {
    const proxyHeaders = { ...proxyRes.headers };
    delete proxyHeaders['content-encoding'];
    delete proxyHeaders['transfer-encoding'];
    proxyHeaders['Content-Type'] = proxyRes.headers['content-type'] || 'application/json';
    proxyHeaders['Access-Control-Allow-Origin'] = '*';
    
    let body = [];
    proxyRes.on('data', (chunk) => {
      body.push(chunk);
    });
    proxyRes.on('end', () => {
      const responseBody = Buffer.concat(body);
      proxyHeaders['content-length'] = Buffer.byteLength(responseBody);
      res.writeHead(proxyRes.statusCode, proxyHeaders);
      res.end(responseBody);
    });
  });

  proxyReq.on('error', (err) => {
    console.error('代理错误:', err.message);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: '后端服务不可用' }));
  });

  req.pipe(proxyReq);
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname, {
  setHeaders: (res, path) => {
    if (path.endsWith('.js') || path.endsWith('.css')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });

app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: err.message || '服务器错误' }); });

app.listen(PORT, () => { console.log('前端服务器运行在 http://localhost:' + PORT); console.log(`API代理转发到 http://${BACKEND_HOST}:${BACKEND_PORT}`); });