const { wrap, send } = require('../lib/http');
const { ATALAYA_CONFIG } = require('../lib/config');

module.exports = wrap(['GET'], async (req, res) => {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    return send(res, 200, `window.ATALAYA_CONFIG = ${JSON.stringify(ATALAYA_CONFIG)};`);
});