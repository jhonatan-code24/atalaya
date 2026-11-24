# Atalaya · Valet parking

Local: `npm i` → `cp .env.example .env` (poner DATABASE_URL) → `npm run db:init` → `npm run dev`.
Despliegue: subir a GitHub → Vercel "Import Project" → cargar las variables de `.env.example`.
Cambiar país: `activeProfile` en `lib/config.js` ("CO" | "ES"). Tarifas, extras, pagos y terminales están ahí.
Valets/admin: variables `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SESSION_SECRET` en Vercel; portal en `/#valet`. Tras actualizar: `npm run db:init`.
Correo de confirmación: `GMAIL_USER` y `GMAIL_APP_PASSWORD` (contraseña de aplicación de Google, sin espacios).
Webhook de pago: `POST /api/webhooks/mercadopago`. n8n: `N8N_ENABLED=true` + `N8N_WEBHOOK_URL`.
