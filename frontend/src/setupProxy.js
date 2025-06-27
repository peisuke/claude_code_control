const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Use BACKEND_PORT environment variable if set, otherwise default to 8000
  const backendPort = process.env.BACKEND_PORT || '8000';
  
  app.use(
    '/api',
    createProxyMiddleware({
      target: `http://localhost:${backendPort}`,
      changeOrigin: true,
    })
  );
};