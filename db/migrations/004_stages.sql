-- Estados del servicio: open → assigned → waiting → picked → parked → enroute → returned (completada)
alter table reservations drop constraint if exists reservations_stage_check;
update reservations set stage = 'picked' where stage = 'received';   -- estado antiguo
alter table reservations add constraint reservations_stage_check
  check (stage in ('open','assigned','waiting','picked','parked','enroute','returned'));
-- Historial de cambios de estado: [{stage, at}]
alter table reservations add column if not exists stage_log jsonb not null default '[]';