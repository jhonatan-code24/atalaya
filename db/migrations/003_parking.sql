-- Tipo de parking elegido (open = descubierto, covered = cubierto)
alter table reservations add column if not exists parking text;