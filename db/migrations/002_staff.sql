-- Cuentas de valet (requieren aprobación del admin) + asignación de reservas
create table if not exists staff (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text unique not null,                 -- minúsculas
  phone       text not null,
  pass_hash   text not null,                        -- scrypt (nunca la contraseña)
  status      text not null default 'pending' check (status in ('pending','approved','rejected','suspended')),
  created_at  timestamptz not null default now(),
  approved_at timestamptz,
  approved_by text
);
alter table reservations add column if not exists assigned_to uuid references staff(id);
alter table reservations add column if not exists assigned_at timestamptz;
alter table reservations add column if not exists stage text not null default 'open' check (stage in ('open','assigned','received','returned'));
create index if not exists reservations_stage_idx on reservations (stage, entrega);
-- Anti fuerza bruta del login
create table if not exists login_throttle (key text primary key, fails int not null default 0, locked_until timestamptz);
-- Seguridad: la API usa la conexión directa; se bloquea el acceso público (p. ej. API REST de Supabase)
alter table staff enable row level security;
alter table reservations enable row level security;
alter table login_throttle enable row level security;