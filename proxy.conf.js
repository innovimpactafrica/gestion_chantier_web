const PROXY_CONFIG = {
  '/btpconnect': {
    target: 'https://btpconnect.app',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
    onProxyReq: function (proxyReq) {
      // Suppress Origin/Referer so Spring Security treats this as a server-to-server
      // call (like curl) and skips its CSRF origin-check, which requires a cookie token
      // when these headers are present.
      proxyReq.removeHeader('origin');
      proxyReq.removeHeader('referer');
    }
  },
  '/repertoire_chantier': {
    target: 'https://btpconnect.app',
    secure: false,
    changeOrigin: true
  }
};

module.exports = PROXY_CONFIG;
