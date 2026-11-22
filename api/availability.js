// GET /api/availability?entrega=...&recogida=...&placa=...
const { wrap, send } = require('../lib/http');
const { active } = require('../lib/config');
const { checkDates } = require('../lib/validate');
const { availability } = require('../lib/reservations');
const db = require('../lib/db');
module.exports = wrap(['GET'], async (req, res) => {
  const p = active(), { entrega, recogida, placa } = req.query;
  checkDates(p, entrega, recogida);
  send(res, 200, await availability(db(), p, entrega, recogida, String(placa || '').toUpperCase()));
});
