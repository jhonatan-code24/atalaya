// Sesiones de valets/admin: cookie HttpOnly firmada (HMAC). Contraseñas con scrypt.
const crypto = require('crypto');
const { HttpError } = require('./http');
const db = require('./db');

const adminEmail = () => (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const safeEq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const secret = () => { if (!process.env.SESSION_SECRET) throw new HttpError(500, 'Falta SESSION_SECRET en el servidor.'); return process.env.SESSION_SECRET; };
const sign = s => crypto.createHmac('sha256', secret()).update(s).digest('base64url');
const makeToken = p => { const body = Buffer.from(JSON.stringify({ ...p, exp: Date.now() + 12 * 3600e3 })).toString('base64url'); return body + '.' + sign(body); };
const readToken = t => {
    const [body, sig] = String(t || '').split('.');
    if (!body || !sig || !safeEq(sig, sign(body))) return null;
    try { const p = JSON.parse(Buffer.from(body, 'base64url')); return p.exp > Date.now() ? p : null; } catch { return null; }
};
const hashPw = pw => { const salt = crypto.randomBytes(16).toString('hex'); return salt + ':' + crypto.scryptSync(pw, salt, 64).toString('hex'); };
const checkPw = (pw, stored) => { const [salt, h] = String(stored).split(':'); return !!h && safeEq(crypto.scryptSync(pw, salt, 64).toString('hex'), h); };
const setCookie = (res, token, maxAge = 43200) =>
    res.setHeader('Set-Cookie', `atl_staff=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${process.env.VERCEL ? '; Secure' : ''}`);

// Exige sesión válida y rol. Los valets se revalidan contra la BD en cada petición (si el admin los suspende, pierden acceso al instante)
async function session(req, roles) {
    if (req.method !== 'GET' && !(req.headers['content-type'] || '').includes('application/json')) throw new HttpError(415, 'Solicitud no válida.');
    const m = /(?:^|;\s*)atl_staff=([^;]+)/.exec(req.headers.cookie || ''), t = readToken(m && m[1]);
    if (!t) throw new HttpError(401, 'Inicia sesión.');
    if (t.role === 'admin') { if (t.email !== adminEmail()) throw new HttpError(401, 'Inicia sesión.'); }
    else {
        const { rows: [s] } = await db().query('select id, name, email, phone, status from staff where id = $1', [t.id]);
        if (!s || s.status !== 'approved') throw new HttpError(403, 'Tu acceso no está autorizado por el administrador.');
        t.name = s.name; t.phone = s.phone;
    }
    if (roles && !roles.includes(t.role)) throw new HttpError(403, 'No tienes permiso para esto.');
    return t;
}

// Bloqueo de 15 min tras 5 intentos fallidos (por correo, exista o no la cuenta)
const checkLock = async key => {
    const { rows: [r] } = await db().query('select locked_until from login_throttle where key = $1', [key]);
    if (r && r.locked_until && r.locked_until > new Date()) throw new HttpError(429, 'Demasiados intentos. Intenta de nuevo en 15 minutos.');
};
const addFail = key => db().query(`insert into login_throttle (key, fails) values ($1, 1) on conflict (key) do update set fails = login_throttle.fails + 1,
  locked_until = case when login_throttle.fails + 1 >= 5 then now() + interval '15 minutes' else login_throttle.locked_until end`, [key]);
const clearFails = key => db().query('delete from login_throttle where key = $1', [key]);

module.exports = { adminEmail, safeEq, makeToken, readToken, hashPw, checkPw, setCookie, session, checkLock, addFail, clearFails };