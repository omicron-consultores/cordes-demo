-- =====================================================================
-- CORDES · Demo funcional · 02 · Lógica de negocio (RPC) y vistas
-- Regla: toda escritura que afecte a más de una tabla pasa por una función
-- (transacción atómica). El frontend solo llama supabase.rpc(...).
-- =====================================================================

-- ---------------------------------------------------------------------
-- CITAS
-- Turno de consulta externa: lun–vie, 08:00–14:00 (6 h), cupos de 20 min = 18 cupos.
-- ---------------------------------------------------------------------
create or replace function available_slots(p_doctor_id uuid, p_date date)
returns table (slot timestamptz)
language sql stable set search_path = public
as $$
  with grid as (
    select ((p_date + time '08:00' + make_interval(mins => g * 20)) at time zone 'America/La_Paz') as slot
    from generate_series(0, 17) g
    where extract(isodow from p_date) < 6
  )
  select g.slot
  from grid g
  where g.slot > now()
    and not exists (
      select 1 from appointments a
      where a.doctor_id = p_doctor_id
        and a.scheduled_at = g.slot
        and a.status in ('programada', 'en_atencion', 'atendida')
    )
  order by g.slot
$$;

create or replace function book_appointment(
  p_patient_id   uuid,
  p_doctor_id    uuid,
  p_scheduled_at timestamptz,
  p_reason       text default null,
  p_channel      appointment_channel default 'app'
) returns appointments
language plpgsql set search_path = public
as $$
declare
  v_doc doctors;
  v_row appointments;
begin
  select * into v_doc from doctors where id = p_doctor_id and active;
  if not found then
    raise exception 'Médico no encontrado';
  end if;

  if not exists (
    select 1 from available_slots(p_doctor_id, (p_scheduled_at at time zone 'America/La_Paz')::date) s
    where s.slot = p_scheduled_at
  ) then
    raise exception 'El horario seleccionado ya no está disponible';
  end if;

  insert into appointments (patient_id, doctor_id, establishment_code, scheduled_at, reason, channel)
  values (p_patient_id, p_doctor_id, v_doc.establishment_code, p_scheduled_at, p_reason, p_channel)
  returning * into v_row;

  return v_row;
end $$;

create or replace function reschedule_appointment(p_appointment_id uuid, p_new_at timestamptz)
returns appointments
language plpgsql set search_path = public
as $$
declare v_row appointments;
begin
  select * into v_row from appointments where id = p_appointment_id for update;
  if not found then raise exception 'Cita no encontrada'; end if;
  if v_row.status <> 'programada' then
    raise exception 'Solo se puede reprogramar una cita programada (estado actual: %)', v_row.status;
  end if;
  if not exists (
    select 1 from available_slots(v_row.doctor_id, (p_new_at at time zone 'America/La_Paz')::date) s
    where s.slot = p_new_at
  ) then
    raise exception 'El nuevo horario no está disponible';
  end if;

  update appointments
     set scheduled_at = p_new_at,
         reschedule_count = reschedule_count + 1,
         updated_at = now()
   where id = p_appointment_id
  returning * into v_row;
  return v_row;
end $$;

create or replace function cancel_appointment(p_appointment_id uuid, p_reason text default null)
returns appointments
language plpgsql set search_path = public
as $$
declare v_row appointments;
begin
  update appointments
     set status = 'cancelada', cancel_reason = p_reason, updated_at = now()
   where id = p_appointment_id and status = 'programada'
  returning * into v_row;
  if not found then raise exception 'La cita no existe o ya no está programada'; end if;
  return v_row;
end $$;

create or replace function mark_no_show(p_appointment_id uuid)
returns appointments
language plpgsql set search_path = public
as $$
declare v_row appointments;
begin
  update appointments
     set status = 'no_asistio', updated_at = now()
   where id = p_appointment_id and status = 'programada'
  returning * into v_row;
  if not found then raise exception 'La cita no existe o ya no está programada'; end if;
  return v_row;
end $$;

-- ---------------------------------------------------------------------
-- ATENCIÓN MÉDICA (HCE) Y RECETA
-- ---------------------------------------------------------------------
create or replace function start_encounter(p_appointment_id uuid)
returns uuid
language plpgsql set search_path = public
as $$
declare
  v_appt appointments;
  v_id   uuid;
begin
  select * into v_appt from appointments where id = p_appointment_id for update;
  if not found then raise exception 'Cita no encontrada'; end if;

  select id into v_id from encounters where appointment_id = p_appointment_id;
  if v_id is not null then return v_id; end if;           -- idempotente: reabrir la misma atención

  if v_appt.status <> 'programada' then
    raise exception 'La cita no puede iniciarse (estado: %)', v_appt.status;
  end if;

  insert into encounters (appointment_id, patient_id, doctor_id, establishment_code, chief_complaint)
  values (v_appt.id, v_appt.patient_id, v_appt.doctor_id, v_appt.establishment_code, v_appt.reason)
  returning id into v_id;

  update appointments set status = 'en_atencion', updated_at = now() where id = v_appt.id;
  return v_id;
end $$;

-- p_data: { chief_complaint, weight_kg, height_cm, bp_systolic, bp_diastolic, heart_rate,
--           temperature_c, findings, diagnosis_code, diagnosis_notes, plan }
-- p_items: [ { medication_code, dose, frequency, duration_days, quantity, instructions } ]
-- Devuelve el id de la receta (null si no se recetó nada).
create or replace function complete_encounter(
  p_encounter_id uuid,
  p_data         jsonb,
  p_items        jsonb default '[]'::jsonb,
  p_notes        text  default null
) returns uuid
language plpgsql set search_path = public
as $$
declare
  v_enc   encounters;
  v_rx_id uuid;
begin
  select * into v_enc from encounters where id = p_encounter_id for update;
  if not found then raise exception 'Atención no encontrada'; end if;
  if v_enc.finished_at is not null then raise exception 'La atención ya fue cerrada'; end if;

  update encounters set
    chief_complaint = coalesce(p_data->>'chief_complaint', chief_complaint),
    weight_kg       = (p_data->>'weight_kg')::numeric,
    height_cm       = (p_data->>'height_cm')::numeric,
    bp_systolic     = (p_data->>'bp_systolic')::smallint,
    bp_diastolic    = (p_data->>'bp_diastolic')::smallint,
    heart_rate      = (p_data->>'heart_rate')::smallint,
    temperature_c   = (p_data->>'temperature_c')::numeric,
    findings        = p_data->>'findings',
    diagnosis_code  = p_data->>'diagnosis_code',
    diagnosis_notes = p_data->>'diagnosis_notes',
    plan            = p_data->>'plan',
    finished_at     = now()
  where id = p_encounter_id;

  if v_enc.appointment_id is not null then
    update appointments set status = 'atendida', updated_at = now() where id = v_enc.appointment_id;
  end if;

  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) > 0 then
    insert into prescriptions (encounter_id, patient_id, doctor_id, notes)
    values (v_enc.id, v_enc.patient_id, v_enc.doctor_id, p_notes)
    returning id into v_rx_id;

    insert into prescription_items
      (prescription_id, line_no, medication_code, dose, frequency, duration_days, quantity_prescribed, instructions)
    select v_rx_id, x.ord::smallint, x.medication_code, x.dose, x.frequency, x.duration_days, x.quantity, x.instructions
    from rows from (
           jsonb_to_recordset(p_items)
             as (medication_code text, dose text, frequency text, duration_days int, quantity int, instructions text)
         ) with ordinality as x(medication_code, dose, frequency, duration_days, quantity, instructions, ord);
  end if;

  return v_rx_id;
end $$;

-- ---------------------------------------------------------------------
-- FARMACIA · DISPENSACIÓN (núcleo transaccional de la demo)
-- FEFO: First Expired, First Out → se descuenta primero el lote que vence antes.
-- Nunca se dispensa de lotes vencidos. Admite dispensación parcial.
-- p_lines (opcional): [ { item_id, quantity } ] para dispensar solo algunas líneas/cantidades.
-- ---------------------------------------------------------------------
create or replace function dispense_prescription(
  p_prescription_id uuid,
  p_lines           jsonb       default null,
  p_actor           text        default 'Farmacia Planta Central',
  p_at              timestamptz default now()
) returns jsonb
language plpgsql set search_path = public
as $$
declare
  v_rx        prescriptions;
  v_item      record;
  v_lot       record;
  v_want      integer;
  v_take      integer;
  v_given     integer;
  v_any       boolean := false;
  v_lines     jsonb := '[]'::jsonb;
  v_pending   integer;
  v_done      integer;
  v_status    prescription_status;
  v_day       date := (p_at at time zone 'America/La_Paz')::date;
begin
  -- 1) Bloqueo la receta: dos farmacéuticos no pueden dispensarla a la vez.
  select * into v_rx from prescriptions where id = p_prescription_id for update;
  if not found then raise exception 'Receta no encontrada'; end if;
  if v_rx.status in ('dispensada', 'anulada') then
    raise exception 'La receta RX-% ya está %', lpad(v_rx.folio::text, 6, '0'), v_rx.status;
  end if;

  -- 2) Recorro las líneas pendientes.
  for v_item in
    select pi.id, pi.medication_code,
           pi.quantity_prescribed - pi.quantity_dispensed as pending,
           case when p_lines is null then pi.quantity_prescribed - pi.quantity_dispensed
                else (select (l->>'quantity')::int from jsonb_array_elements(p_lines) l
                      where (l->>'item_id')::uuid = pi.id) end as requested
    from prescription_items pi
    where pi.prescription_id = p_prescription_id
      and pi.quantity_dispensed < pi.quantity_prescribed
    order by pi.line_no
  loop
    v_want  := least(greatest(coalesce(v_item.requested, 0), 0), v_item.pending);
    v_given := 0;

    -- 3) Consumo lotes vigentes en orden FEFO, bloqueándolos.
    if v_want > 0 then
      for v_lot in
        select id, quantity from stock_lots
        where medication_code = v_item.medication_code
          and quantity > 0
          and expires_at > v_day
        order by expires_at, received_at
        for update
      loop
        exit when v_given >= v_want;
        v_take := least(v_lot.quantity, v_want - v_given);

        update stock_lots set quantity = quantity - v_take where id = v_lot.id;

        insert into inventory_movements
          (medication_code, lot_id, type, quantity, prescription_item_id, actor, note, created_at)
        values
          (v_item.medication_code, v_lot.id, 'dispensacion', -v_take, v_item.id, p_actor,
           'Receta RX-' || lpad(v_rx.folio::text, 6, '0'), p_at);

        v_given := v_given + v_take;
      end loop;
    end if;

    if v_given > 0 then
      update prescription_items set quantity_dispensed = quantity_dispensed + v_given where id = v_item.id;
      v_any := true;
    end if;

    v_lines := v_lines || jsonb_build_object(
      'item_id', v_item.id, 'medication_code', v_item.medication_code,
      'requested', v_want, 'dispensed', v_given, 'shortage', v_want - v_given);
  end loop;

  -- 4) Estado resultante de la receta.
  select coalesce(sum(quantity_prescribed - quantity_dispensed), 0), coalesce(sum(quantity_dispensed), 0)
    into v_pending, v_done
  from prescription_items where prescription_id = p_prescription_id;

  v_status := case when v_pending = 0 then 'dispensada'::prescription_status
                   when v_done > 0   then 'parcial'::prescription_status
                   else v_rx.status end;

  update prescriptions set
    status            = v_status,
    last_dispensed_at = case when v_any then p_at else last_dispensed_at end,
    dispensed_at      = case when v_pending = 0 then p_at else dispensed_at end
  where id = p_prescription_id;

  return jsonb_build_object(
    'prescription_id', p_prescription_id,
    'folio', 'RX-' || lpad(v_rx.folio::text, 6, '0'),
    'status', v_status,
    'lines', v_lines);
end $$;

create or replace function cancel_prescription(p_prescription_id uuid)
returns prescriptions
language plpgsql set search_path = public
as $$
declare v_row prescriptions;
begin
  update prescriptions set status = 'anulada'
   where id = p_prescription_id and status = 'emitida'
  returning * into v_row;
  if not found then raise exception 'Solo se puede anular una receta emitida sin dispensar'; end if;
  return v_row;
end $$;

-- ---------------------------------------------------------------------
-- INVENTARIO
-- ---------------------------------------------------------------------
create or replace function receive_stock(
  p_medication_code text,
  p_lot_number      text,
  p_expires_at      date,
  p_quantity        integer,
  p_actor           text default 'Almacén central',
  p_at              timestamptz default now()
) returns stock_lots
language plpgsql set search_path = public
as $$
declare v_lot stock_lots;
begin
  if p_quantity <= 0 then raise exception 'La cantidad debe ser mayor a cero'; end if;

  insert into stock_lots (medication_code, lot_number, expires_at, quantity, received_at)
  values (p_medication_code, p_lot_number, p_expires_at, p_quantity, (p_at at time zone 'America/La_Paz')::date)
  on conflict (medication_code, lot_number)
    do update set quantity = stock_lots.quantity + excluded.quantity
  returning * into v_lot;

  insert into inventory_movements (medication_code, lot_id, type, quantity, actor, note, created_at)
  values (p_medication_code, v_lot.id, 'ingreso', p_quantity, p_actor, 'Ingreso lote ' || p_lot_number, p_at);

  return v_lot;
end $$;

create or replace function write_off_expired_lot(p_lot_id uuid, p_actor text default 'Farmacia Planta Central')
returns stock_lots
language plpgsql set search_path = public
as $$
declare v_lot stock_lots;
begin
  select * into v_lot from stock_lots where id = p_lot_id for update;
  if not found then raise exception 'Lote no encontrado'; end if;
  if v_lot.expires_at > bo_today() then raise exception 'El lote aún no está vencido'; end if;
  if v_lot.quantity = 0 then raise exception 'El lote no tiene saldo'; end if;

  insert into inventory_movements (medication_code, lot_id, type, quantity, actor, note)
  values (v_lot.medication_code, v_lot.id, 'baja_vencimiento', -v_lot.quantity, p_actor, 'Baja por vencimiento lote ' || v_lot.lot_number);

  update stock_lots set quantity = 0 where id = p_lot_id returning * into v_lot;
  return v_lot;
end $$;

-- ---------------------------------------------------------------------
-- VISTAS (security_invoker: respetan RLS del usuario que consulta)
-- ---------------------------------------------------------------------
create or replace view v_medication_stock with (security_invoker = true) as
with agg as (
  select m.code,
         coalesce(sum(l.quantity) filter (where l.expires_at >  bo_today()), 0)::int as available,
         coalesce(sum(l.quantity) filter (where l.expires_at <= bo_today()), 0)::int as expired,
         coalesce(sum(l.quantity) filter (where l.expires_at >  bo_today()
                                            and l.expires_at <= bo_today() + 90), 0)::int as expiring_90d,
         min(l.expires_at) filter (where l.expires_at > bo_today()) as next_expiry,
         count(l.id) as lots
  from medications m
  left join stock_lots l on l.medication_code = m.code and l.quantity > 0
  group by m.code
)
select m.code, m.name, m.form, m.concentration, m.category, m.unit_price, m.min_stock,
       m.high_rotation, m.allergen_group,
       a.available, a.expired, a.expiring_90d, a.next_expiry, a.lots,
       round(a.available * m.unit_price, 2) as stock_value,
       case when a.available = 0                      then 'agotado'
            when a.available < m.min_stock * 0.5      then 'critico'
            when a.available < m.min_stock            then 'bajo'
            else 'ok' end as stock_status
from medications m join agg a using (code)
where m.active;

create or replace view v_lots with (security_invoker = true) as
select l.*, m.name as medication_name, m.form, m.concentration,
       (l.expires_at - bo_today()) as days_to_expiry,
       case when l.expires_at <= bo_today()       then 'vencido'
            when l.expires_at <= bo_today() + 90  then 'por_vencer'
            else 'vigente' end as expiry_status
from stock_lots l join medications m on m.code = l.medication_code
where l.quantity > 0;

create or replace view v_appointments with (security_invoker = true) as
select a.*,
       (a.scheduled_at at time zone 'America/La_Paz')::date as local_date,
       p.first_names || ' ' || p.last_names as patient_name, p.matricula,
       d.full_name as doctor_name, s.code as specialty_code, s.name as specialty_name,
       e.name as establishment_name, e.zone as establishment_zone
from appointments a
join patients p       on p.id = a.patient_id
join doctors d        on d.id = a.doctor_id
join specialties s    on s.code = d.specialty_code
join establishments e on e.code = a.establishment_code;

create or replace view v_encounters with (security_invoker = true) as
select en.*,
       d.full_name as doctor_name, s.name as specialty_name, e.name as establishment_name,
       c.label as diagnosis_label,
       rx.id as prescription_id, rx.folio as prescription_folio, rx.status as prescription_status
from encounters en
join doctors d        on d.id = en.doctor_id
join specialties s    on s.code = d.specialty_code
join establishments e on e.code = en.establishment_code
left join cie10 c     on c.code = en.diagnosis_code
left join prescriptions rx on rx.encounter_id = en.id;

-- Bandeja de Farmacia: recetas pendientes con indicador de stock suficiente.
create or replace view v_prescription_queue with (security_invoker = true) as
select rx.id, rx.folio, 'RX-' || lpad(rx.folio::text, 6, '0') as folio_label, rx.status, rx.issued_at,
       rx.patient_id, p.first_names || ' ' || p.last_names as patient_name, p.matricula, p.allergies,
       d.full_name as doctor_name, s.name as specialty_name, e.name as establishment_name,
       count(pi.id) as items,
       sum(pi.quantity_prescribed - pi.quantity_dispensed) as units_pending,
       bool_and(st.available >= pi.quantity_prescribed - pi.quantity_dispensed) as stock_ok
from prescriptions rx
join patients p          on p.id = rx.patient_id
join doctors d           on d.id = rx.doctor_id
join specialties s       on s.code = d.specialty_code
join encounters en       on en.id = rx.encounter_id
join establishments e    on e.code = en.establishment_code
join prescription_items pi on pi.prescription_id = rx.id
join v_medication_stock st on st.code = pi.medication_code
where rx.status in ('emitida', 'parcial')
group by rx.id, p.id, d.id, s.name, e.name;

create or replace view v_prescription_items with (security_invoker = true) as
select pi.*, m.name as medication_name, m.form, m.concentration, m.allergen_group,
       st.available, st.stock_status,
       pi.quantity_prescribed - pi.quantity_dispensed as quantity_pending
from prescription_items pi
join medications m        on m.code = pi.medication_code
join v_medication_stock st on st.code = pi.medication_code;

-- KPIs del día (una fila).
create or replace view v_kpis_today with (security_invoker = true) as
select
  (select count(*) from appointments a where (a.scheduled_at at time zone 'America/La_Paz')::date = bo_today() and a.status <> 'cancelada') as appointments_today,
  (select count(*) from appointments a where (a.scheduled_at at time zone 'America/La_Paz')::date = bo_today() and a.status = 'atendida')    as attended_today,
  (select count(*) from appointments a where (a.scheduled_at at time zone 'America/La_Paz')::date = bo_today() and a.status in ('programada','en_atencion')) as waiting_today,
  (select count(*) from appointments a where (a.scheduled_at at time zone 'America/La_Paz')::date = bo_today() and a.status = 'no_asistio') as no_show_today,
  (select count(*) from prescriptions r where (r.issued_at at time zone 'America/La_Paz')::date = bo_today()) as prescriptions_today,
  (select count(*) from prescriptions r where (r.dispensed_at at time zone 'America/La_Paz')::date = bo_today()) as dispensed_today,
  (select count(*) from prescriptions r where r.status in ('emitida','parcial')) as pharmacy_queue,
  (select coalesce(-sum(m.quantity), 0) from inventory_movements m where m.type = 'dispensacion' and (m.created_at at time zone 'America/La_Paz')::date = bo_today()) as units_dispensed_today,
  (select count(*) from v_medication_stock s where s.stock_status in ('bajo','critico','agotado')) as meds_in_alert,
  (select count(*) from v_lots l where l.expiry_status = 'por_vencer') as lots_expiring_90d,
  (select count(*) from v_lots l where l.expiry_status = 'vencido')    as lots_expired,
  (select coalesce(sum(stock_value), 0) from v_medication_stock) as inventory_value;

-- Actividad diaria últimos 30 días (para gráficos).
create or replace view v_daily_activity with (security_invoker = true) as
with days as (
  select d::date as day from generate_series(bo_today() - 29, bo_today(), interval '1 day') d
)
select days.day,
  (select count(*) from appointments a where (a.scheduled_at at time zone 'America/La_Paz')::date = days.day and a.status <> 'cancelada') as appointments,
  (select count(*) from appointments a where (a.scheduled_at at time zone 'America/La_Paz')::date = days.day and a.status = 'atendida')  as attended,
  (select count(*) from appointments a where (a.scheduled_at at time zone 'America/La_Paz')::date = days.day and a.status = 'no_asistio') as no_show,
  (select count(*) from prescriptions r where (r.issued_at at time zone 'America/La_Paz')::date = days.day) as prescriptions,
  (select coalesce(-sum(m.quantity), 0) from inventory_movements m
     where m.type = 'dispensacion' and (m.created_at at time zone 'America/La_Paz')::date = days.day) as units_dispensed
from days
order by days.day;

create or replace view v_top_medications_30d with (security_invoker = true) as
select m.code, m.name, m.form, m.concentration,
       -sum(mv.quantity)::int as units,
       round(-sum(mv.quantity) * m.unit_price, 2) as value_bs
from inventory_movements mv
join medications m on m.code = mv.medication_code
where mv.type = 'dispensacion'
  and mv.created_at >= now() - interval '30 days'
group by m.code
order by units desc;

create or replace view v_diagnoses_30d with (security_invoker = true) as
select c.code, c.label, count(*) as encounters
from encounters en join cie10 c on c.code = en.diagnosis_code
where en.started_at >= now() - interval '30 days'
group by c.code
order by encounters desc;

-- ---------------------------------------------------------------------
-- ACCESO (demo pública sin login; ver CLAUDE.md · Riesgos aceptados)
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['establishments','specialties','cie10','medications','doctors','patients',
                           'appointments','encounters','prescriptions','prescription_items',
                           'stock_lots','inventory_movements']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists demo_full_access on %I', t);
    execute format('create policy demo_full_access on %I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
grant execute on all functions in schema public to anon, authenticated;

-- Realtime (solo existe en Supabase): pantallas que se actualizan solas entre dispositivos.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table appointments, prescriptions, stock_lots;
  end if;
end $$;
