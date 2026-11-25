class HttpError extends Error { constructor(status, message, fields) { super(message); this.status = status; this.fields = fields; } }
const send = (res, status, body) => res.status(status).json(body);
const migrate = require('./migrate');
// Valida el método, captura errores y responde siempre JSON
const wrap = (methods, fn) => async (req, res) => {
    if (!methods.includes(req.method)) { res.setHeader('Allow', methods.join(', ')); return send(res, 405, { error: 'Método no permitido' }); }
    try { await migrate(); await fn(req, res); }
    catch (e) {
        if (e.status) return send(res, e.status, { error: e.message, fields: e.fields });
        console.error(e); send(res, 500, { error: 'Error interno del servidor', detail: process.env.DEBUG_ERRORS === 'true' ? e.message : undefined });
    }
};
module.exports = { HttpError, send, wrap };