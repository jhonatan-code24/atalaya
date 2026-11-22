// Envía eventos a n8n (solo si N8N_ENABLED=true). Nunca rompe la reserva si falla.
async function notifyN8n(event, reservation) {
    if (process.env.N8N_ENABLED !== 'true' || !process.env.N8N_WEBHOOK_URL) return false;
    const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 4000);
    try {
        const r = await fetch(process.env.N8N_WEBHOOK_URL, {
            method: 'POST', signal: ctrl.signal,
            headers: { 'Content-Type': 'application/json', 'x-atalaya-secret': process.env.N8N_SECRET || '' },
            body: JSON.stringify({ event, sentAt: new Date().toISOString(), reservation })
        });
        return r.ok;
    } catch (e) { console.error('n8n:', e.message); return false; }
    finally { clearTimeout(t); }
}
module.exports = { notifyN8n };