// GET /api/staff → sesión actual | POST {action: register | login | logout}
const { wrap, send, HttpError } = require('../lib/http');
const A = require('../lib/auth');
const db = require('../lib/db');
const { notifyN8n } = require('../lib/n8n');
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

module.exports = wrap(['GET', 'POST'], async (req, res) => {
    if (req.method === 'GET') { const s = await A.session(req); return send(res, 200, { role: s.role, name: s.name, email: s.email }); }
    const b = req.body || {}, email = String(b.email || '').trim().toLowerCase(), pw = String(b.password || '');

    if (b.action === 'logout') { A.setCookie(res, '', 0); return send(res, 200, { ok: true }); }

    if (b.action === 'register') { // la cuenta queda "pending" hasta que el admin la apruebe
        const name = String(b.name || '').trim().slice(0, 80), phone = String(b.phone || '').trim().slice(0, 30);
        if (name.length < 3 || !EMAIL.test(email) || phone.replace(/\D/g, '').length < 7 || pw.length < 8) throw new HttpError(400, 'Revisa tus datos (contraseña de mínimo 8 caracteres).');
        if (email === A.adminEmail()) throw new HttpError(409, 'Ese correo no está disponible.');
        try { await db().query('insert into staff (name, email, phone, pass_hash) values ($1,$2,$3,$4)', [name, email, phone, A.hashPw(pw)]); }
        catch (e) { if (e.code === '23505') throw new HttpError(409, 'Ya existe una solicitud con este correo.'); throw e; }
        await notifyN8n('staff.registered', { name, email, phone }); // aviso al admin (si n8n está activo)
        return send(res, 201, { ok: true, message: 'Solicitud enviada. Un administrador debe aprobar tu cuenta antes de que puedas ingresar.' });
    }

    if (b.action === 'login') {
        await A.checkLock(email);
        let who = null;
        if (email && email === A.adminEmail()) {
            if (process.env.ADMIN_PASSWORD && A.safeEq(pw, process.env.ADMIN_PASSWORD)) who = { role: 'admin', id: 'admin', name: 'Administrador', email };
        } else {
            const { rows: [s] } = await db().query('select id, name, email, pass_hash, status from staff where email = $1', [email]);
            if (s && A.checkPw(pw, s.pass_hash)) {
                const msg = { pending: 'Tu cuenta está pendiente de aprobación del administrador.', rejected: 'Tu solicitud no fue aprobada.', suspended: 'Tu cuenta está suspendida.' }[s.status];
                if (msg) throw new HttpError(403, msg); // solo se revela con la contraseña correcta
                who = { role: 'valet', id: s.id, name: s.name, email };
            }
        }
        if (!who) { await A.addFail(email); throw new HttpError(401, 'Correo o contraseña incorrectos.'); }
        await A.clearFails(email); A.setCookie(res, A.makeToken(who));
        return send(res, 200, { role: who.role, name: who.name });
    }
    throw new HttpError(400, 'Acción no válida.');
});