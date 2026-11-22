// POST /api/quote {entrega, recogida, extras[]} → tarifa oficial + disponibilidad
const { wrap, send } = require('../lib/http');
const { ATALAYA_CONFIG, active } = require('../lib/config');
const { quote } = require('../lib/pricing');
const { checkDates } = require('../lib/validate');
const { availability } = require('../lib/reservations');
const db = require('../lib/db');
module.exports = wrap(['POST'], async (req, res) => {
    const p = active(), b = req.body || {};
    checkDates(p, b.entrega, b.recogida);
    const av = await availability(db(), p, b.entrega, b.recogida);
    send(res, 200, { ...quote(ATALAYA_CONFIG, p, b), available: av.available });
});