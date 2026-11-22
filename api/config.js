// GET /config.js → window.ATALAYA_CONFIG (solo el perfil activo)
const { publicConfig } = require('../lib/config');
module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.status(200).send('window.ATALAYA_CONFIG=' + JSON.stringify(publicConfig()).replace(/</g, '\\u003c') + ';');
};
