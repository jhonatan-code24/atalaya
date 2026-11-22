-- Reservas de Atalaya (PostgreSQL). Fechas = hora local de la sede (columna tz).
create table if not exists reservations (
  id              uuid primary key default gen_random_uuid(),
  code            text unique not null,
  profile         text not null,                 -- CO | ES
  venue           text not null,                 -- sede / aeropuerto
  tz              text not null,
  customer_name   text not null,
  customer_email  text not null,                 -- siempre en minúsculas
  customer_phone  text not null,
  plate           text not null,
  vehicle         text not null,
  flight          text,
  entrega         timestamp not null,
  recogida        timestamp not null,
  term_entrega    text not null,
  term_recogida   text not null,                 -- el cliente puede cambiarla
  extras          jsonb not null default '[]',   -- servicios adicionales contratados
  billing         jsonb not null default '[]',   -- líneas del cálculo (auditoría)
  amount          numeric(12,2) not null,        -- total calculado por el servidor
  tax_amount      numeric(12,2) not null default 0,
  currency        text not null,                 -- COP | EUR
  status          text not null default 'confirmed' check (status in ('pending','confirmed','completed','cancelled')),
  payment_method  text,
  payment_detail  text,                          -- dato enmascarado (nunca tarjeta completa)
  payment_provider text,                         -- mercadopago | stripe | ...
  payment_status  text not null default 'unpaid' check (payment_status in ('unpaid','pending','paid','failed','refunded')),
  payment_ref     text,                          -- id de la pasarela
  paid_at         timestamptz,
  rating          smallint check (rating between 1 and 5),
  review          text,
  n8n_notified    boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (recogida > entrega)
);
create index if not exists reservations_slot_idx  on reservations (venue, entrega, recogida) where status not in ('cancelled','completed');
create index if not exists reservations_email_idx on reservations (customer_email);
create index if not exists reservations_plate_idx on reservations (plate);