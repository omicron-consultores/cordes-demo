-- Prueba de punta a punta del flujo de la demo. Ejecutar sobre una BD recién reseteada:
--   psql ... -f supabase/tests/flujo_demo.sql      (o pegar en el SQL Editor de Supabase)
-- Todo corre dentro de una transacción que se revierte al final: no ensucia la demo.
begin;

do $$
declare
  v_pat   uuid;
  v_doc   uuid;
  v_slot  timestamptz;
  v_slot2 timestamptz;
  v_appt  appointments;
  v_enc   uuid;
  v_rx    uuid;
  v_res   jsonb;
  v_before int;
  v_after  int;
  v_status text;
begin
  select id into v_pat from patients where matricula = 'CBA-104523';           -- María Elena Quispe
  select id into v_doc from doctors  where license_number = 'MP-C-4471';       -- Dr. Villarroel

  -- 1) Cupos disponibles en los próximos días hábiles
  select s.slot into v_slot
  from generate_series(bo_today() + 1, bo_today() + 10, interval '1 day') d,
       lateral available_slots(v_doc, d::date) s
  order by s.slot limit 1;
  assert v_slot is not null, 'Debe haber cupos disponibles';

  -- 2) Reservar, intentar doble reserva, reprogramar
  v_appt := book_appointment(v_pat, v_doc, v_slot, 'Control (prueba)', 'app');
  assert v_appt.status = 'programada';
  begin
    perform book_appointment(v_pat, v_doc, v_slot, 'Duplicada', 'app');
    raise exception 'NO_DEBIO_PERMITIR';
  exception when others then
    assert sqlerrm <> 'NO_DEBIO_PERMITIR', 'Se permitió una doble reserva del mismo cupo';
  end;

  select s.slot into v_slot2
  from generate_series(bo_today() + 1, bo_today() + 10, interval '1 day') d,
       lateral available_slots(v_doc, d::date) s
  order by s.slot limit 1;
  v_appt := reschedule_appointment(v_appt.id, v_slot2);
  assert v_appt.reschedule_count = 1 and v_appt.scheduled_at = v_slot2;

  -- 3) Atención médica + receta (incluye Dicloxacilina: solo hay 2 frascos)
  v_enc := start_encounter(v_appt.id);
  assert (select status from appointments where id = v_appt.id) = 'en_atencion';

  v_rx := complete_encounter(v_enc,
    '{"weight_kg":76.5,"height_cm":156,"bp_systolic":132,"bp_diastolic":84,"heart_rate":74,
      "temperature_c":36.5,"findings":"Prueba","diagnosis_code":"I10","plan":"Prueba"}',
    '[{"medication_code":"C-09-02","dose":"1 comprimido","frequency":"cada 24 horas","duration_days":30,"quantity":30},
      {"medication_code":"J-01-42","dose":"5 ml","frequency":"cada 6 horas","duration_days":7,"quantity":5}]');
  assert v_rx is not null;
  assert (select status from appointments where id = v_appt.id) = 'atendida';
  assert (select count(*) from prescription_items where prescription_id = v_rx) = 2;

  -- 4) Dispensación: Losartán completo, Dicloxacilina parcial → receta 'parcial'
  select available into v_before from v_medication_stock where code = 'C-09-02';
  v_res := dispense_prescription(v_rx);
  select available into v_after from v_medication_stock where code = 'C-09-02';
  assert v_before - v_after = 30, 'El stock de Losartán debe bajar exactamente 30';
  assert v_res->>'status' = 'parcial', 'Debe quedar parcial por falta de Dicloxacilina: ' || v_res::text;
  assert (select available from v_medication_stock where code = 'J-01-42') = 0;

  -- 5) Llega stock, se completa la receta
  perform receive_stock('J-01-42', 'LTEST-001', bo_today() + 365, 50);
  v_res := dispense_prescription(v_rx);
  assert v_res->>'status' = 'dispensada', 'Debe completarse: ' || v_res::text;
  assert (select available from v_medication_stock where code = 'J-01-42') = 47;

  -- 6) No se puede dispensar dos veces
  begin
    perform dispense_prescription(v_rx);
    raise exception 'NO_DEBIO_PERMITIR';
  exception when others then
    assert sqlerrm <> 'NO_DEBIO_PERMITIR', 'Se permitió dispensar una receta completa';
  end;

  -- 7) Kardex coherente: saldo de lotes = suma de movimientos
  assert not exists (
    select 1 from stock_lots l
    where l.quantity <> (select coalesce(sum(m.quantity), 0) from inventory_movements m where m.lot_id = l.id)
  ), 'Hay lotes cuyo saldo no cuadra con el kardex';

  -- 8) Nunca se dispensa de lotes vencidos
  assert not exists (
    select 1 from inventory_movements m join stock_lots l on l.id = m.lot_id
    where m.type = 'dispensacion' and l.expires_at <= (m.created_at at time zone 'America/La_Paz')::date
  ), 'Se dispensó desde un lote vencido';

  -- 9) Cancelación
  v_appt := book_appointment(v_pat, v_doc,
    (select s.slot from generate_series(bo_today() + 1, bo_today() + 10, interval '1 day') d,
            lateral available_slots(v_doc, d::date) s order by s.slot limit 1));
  v_appt := cancel_appointment(v_appt.id, 'Prueba');
  assert v_appt.status = 'cancelada';

  raise notice 'OK · flujo completo verificado';
end $$;

rollback;
