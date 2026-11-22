// Capa de acceso a datos de reservas
const crypto = require('crypto');
const db = require('./db');
const { ATALAYA_CONFIG } = require('./config');
const { HttpError } = require('./http');
const { nowLocal } = require('./pricing');

const COLS = `code, profile, venue, tz, customer_name, customer_email, customer_phone, plate, vehicle, flight,
  to_char(entrega,'YYYY-MM-DD"T"HH24:MI') entrega, to_char(recogida,'YYYY-MM-DD"T"HH24:MI') recogida,
  term_entrega, term_recogida, extras, billing, amount, tax_amount, currency, status, payment_method, payment_detail,
  payment_provider, payment_status, rating, review, created_at, assigned_to, stage`;

// Fase según la hora local de la sede
function phase(r) {
    if (r.status === 'completed' || r.status === 'cancelled') return r.status;
    const n = nowLocal(r.tz);
    return n >= r.recogida ? 'completed' : n >= r.entrega ? 'in_progress' : 'upcoming';
}
// Datos que ve el cliente
const dto = r => ({
    code: r.code, profile: r.profile, status: r.status, phase: phase(r), entrega: r.entrega, recogida: r.recogida,
    termEntrega: r.term_entrega, termRecogida: r.term_recogida, placa: r.plate, modelo: r.vehicle, vuelo: r.flight, extras: r.extras,
    total: +r.amount, currency: r.currency, paymentMethod: r.payment_method, paymentDetail: r.payment_detail,
    paymentStatus: r.payment_status, stage: r.stage, rating: r.rating, comment: r.review, createdAt: r.created_at
});
// Datos completos (n8n)
const full = r => ({
    ...dto(r), venue: r.venue, tax: +r.tax_amount, billing: r.billing,
    customer: { name: r.customer_name, email: r.customer_email, phone: r.customer_phone }
});

// Disponibilidad básica: cupo por sede y placa no repetida en el mismo rango
async function availability(q, p, entrega, recogida, plate = '') {
    const { rows: [x] } = await q.query(
        `select count(*)::int used, (count(*) filter (where plate = $4))::int dup from reservations
     where venue = $1 and status not in ('cancelled','completed') and entrega < $3 and recogida > $2`,
        [p.venue, entrega, recogida, plate]);
    return { available: x.used < p.capacity && !x.dup, duplicate: x.dup > 0, remaining: Math.max(0, p.capacity - x.used), capacity: p.capacity };
}
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = p => `${ATALAYA_CONFIG.codePrefix}-${p.id}-` + [...crypto.randomBytes(6)].map(b => ALPHA[b % 32]).join('');

async function create(p, d, q, payStatus) {
    const c = await db().connect();
    try {
        await c.query('begin');
        await c.query('select pg_advisory_xact_lock(hashtext($1))', [p.venue]); // evita sobrecupo por reservas simultáneas
        const av = await availability(c, p, d.entrega, d.recogida, d.placa);
        if (!av.available) throw new HttpError(409, av.duplicate ? 'Ya existe una reserva activa para esa placa en esas fechas.' : 'No hay disponibilidad para esas fechas.');
        const { rows: [r] } = await c.query(
            `insert into reservations (code,profile,venue,tz,customer_name,customer_email,customer_phone,plate,vehicle,flight,entrega,recogida,
        term_entrega,term_recogida,extras,billing,amount,tax_amount,currency,payment_method,payment_detail,payment_status)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16::jsonb,$17,$18,$19,$20,$21,$22) returning ${COLS}`,
            [newCode(p), p.id, p.venue, p.timeZone, d.nombre, d.email, d.tel, d.placa, d.modelo, d.vuelo || null, d.entrega, d.recogida,
            d.termEntrega, d.termRecogida, JSON.stringify(q.extras.map(({ id, name, price }) => ({ id, name, price }))), JSON.stringify(q.lines),
            q.total, q.tax, q.currency, d.paymentMethod, d.paymentDetail, payStatus]);
        await c.query('commit');
        return r;
    } catch (e) { await c.query('rollback').catch(() => { }); throw e; }
    finally { c.release(); }
}
const getByCode = async code => (await db().query(`select ${COLS} from reservations where code = $1`, [code])).rows[0];
async function update(code, set) { // columnas controladas por el servidor (nunca del cliente)
    const k = Object.keys(set);
    return (await db().query(`update reservations set ${k.map((c, i) => `${c} = $${i + 2}`).join(', ')}, updated_at = now() where code = $1 returning ${COLS}`,
        [code, ...k.map(c => set[c])])).rows[0];
}
const setPayment = (code, provider, ref) => db().query('update reservations set payment_provider = $2, payment_ref = $3 where code = $1', [code, provider, ref]);
const markNotified = code => db().query('update reservations set n8n_notified = true where code = $1', [code]);
module.exports = { COLS, availability, create, getByCode, update, setPayment, markNotified, dto, full, phase };