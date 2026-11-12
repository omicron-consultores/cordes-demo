-- =====================================================================
-- CORDES · Demo funcional · 05 · Exámenes (laboratorio + imagen) y antecedentes
--
--   · patients: antecedentes personales, quirúrgicos, familiares y hábitos.
--   · study_catalog: catálogo de estudios (con código LOINC referencial).
--   · diagnostic_orders: estudios solicitados y sus informes.
--   · lab_results: valores de laboratorio con rango y marca (bajo/alto/normal).
--   · RPC: request_studies, register_simulated_result.
--   · Vistas: v_diagnostic_orders, v_lab_results, v_current_medication.
--   · reset_demo() ahora también siembra antecedentes y exámenes.
--
-- Datos: TODOS ficticios. La imagen de Rayos X de tórax es de CDC/PHIL 17298
-- (Dr. Jack Poland), uso educativo con atribución.
-- =====================================================================

-- ---------- Antecedentes ----------
alter table patients
  add column if not exists personal_history text,
  add column if not exists surgical_history text,
  add column if not exists family_history   text,
  add column if not exists habits           text;

-- ---------- Catálogo de estudios ----------
create table if not exists study_catalog (
  code          text primary key,             -- 'LAB-GLU', 'IMG-RXT'
  name          text not null,
  kind          text not null check (kind in ('laboratorio', 'imagen')),
  loinc         text,                         -- código LOINC referencial (estándar internacional)
  analytes      jsonb,                        -- laboratorio: [{code,name,unit,low,high}]
  normal_report text,                         -- imagen: informe normal tipo
  image_path    text,                         -- imagen de ejemplo (en /public)
  image_credit  text
);

create table if not exists diagnostic_orders (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references patients(id) on delete cascade,
  encounter_id  uuid references encounters(id) on delete set null,   -- consulta que lo solicitó
  doctor_id     uuid references doctors(id),
  study_code    text not null references study_catalog(code),
  status        text not null default 'solicitado' check (status in ('solicitado', 'resultado')),
  clinical_note text,                         -- motivo de la solicitud
  requested_at  timestamptz not null default now(),
  resulted_at   timestamptz,
  report        text,                         -- informe (imagen) o comentario (laboratorio)
  reported_by   text
);
create index if not exists diagnostic_orders_patient_idx on diagnostic_orders (patient_id, requested_at desc);

create table if not exists lab_results (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references diagnostic_orders(id) on delete cascade,
  analyte_code  text not null,
  analyte_name  text not null,
  value         numeric(10,3) not null,
  unit          text not null,
  ref_low       numeric(10,2),
  ref_high      numeric(10,2),
  flag          text generated always as (
                  case when ref_low  is not null and value < ref_low  then 'bajo'
                       when ref_high is not null and value > ref_high then 'alto'
                       else 'normal' end) stored
);
create index if not exists lab_results_order_idx on lab_results (order_id);

-- ---------- Simulación de resultados (usada por el seed y por el botón de la demo) ----------
create or replace function _simulate_result(p_order_id uuid, p_at timestamptz default now())
returns diagnostic_orders
language plpgsql set search_path = public
as $$
declare
  v_ord   diagnostic_orders;
  v_cat   study_catalog;
  v_pat   patients;
  v_dx    text;
  v_a     jsonb;
  v_prev  numeric;
  v_val   numeric;
  v_low   numeric;
  v_high  numeric;
  v_dm    boolean;
begin
  select * into v_ord from diagnostic_orders where id = p_order_id for update;
  if not found then raise exception 'Estudio no encontrado'; end if;
  if v_ord.status = 'resultado' then raise exception 'El estudio ya tiene resultado'; end if;

  select * into v_cat from study_catalog where code = v_ord.study_code;
  select * into v_pat from patients where id = v_ord.patient_id;
  select diagnosis_code into v_dx from encounters where id = v_ord.encounter_id;
  v_dm := 'Diabetes mellitus tipo 2' = any (v_pat.chronic_conditions);

  if v_cat.kind = 'laboratorio' then
    for v_a in select * from jsonb_array_elements(v_cat.analytes) loop
      v_low  := (v_a->>'low')::numeric;
      v_high := (v_a->>'high')::numeric;

      -- Si ya hay un valor previo del paciente, se mantiene la tendencia (±5 %).
      select r.value into v_prev
      from lab_results r join diagnostic_orders o on o.id = r.order_id
      where o.patient_id = v_ord.patient_id and r.analyte_code = v_a->>'code'
      order by o.resulted_at desc limit 1;

      if v_prev is not null then
        v_val := v_prev * (0.93 + random() * 0.10);
      else
        v_val := case v_a->>'code'
          when 'GLU'   then case when v_dm then 125 + random() * 60 else 75 + random() * 30 end
          when 'HBA1C' then case when v_dm then 6.6 + random() * 1.6 else 4.6 + random() * 1.0 end
          when 'LDL'   then case when v_dx = 'E78.5' then 140 + random() * 40 else 80 + random() * 60 end
          when 'CT'    then case when v_dx = 'E78.5' then 220 + random() * 40 else 150 + random() * 60 end
          when 'HB'    then case when v_dx = 'D50.9' then 9 + random() * 2.5 else 12.5 + random() * 3 end
          when 'TSH'   then case when v_dx = 'E03.9' then 5 + random() * 4 else 0.8 + random() * 3 end
          when 'LEUO'  then case when v_dx = 'N39.0' then 12 + random() * 30 else random() * 4 end
          else coalesce(v_low, 0) + random() * (coalesce(v_high, coalesce(v_low, 0) * 2 + 1) - coalesce(v_low, 0))
        end;
      end if;

      insert into lab_results (order_id, analyte_code, analyte_name, value, unit, ref_low, ref_high)
      values (v_ord.id, v_a->>'code', v_a->>'name', round(v_val, case when v_a->>'code' = 'DENS' then 3 when coalesce(v_high, 999) < 20 then 1 else 0 end),
              v_a->>'unit', v_low, v_high);
    end loop;

    update diagnostic_orders
       set status = 'resultado', resulted_at = p_at, reported_by = 'Laboratorio clínico · Cala Cala'
     where id = v_ord.id returning * into v_ord;
  else
    update diagnostic_orders
       set status = 'resultado', resulted_at = p_at,
           report = case when v_ord.study_code = 'IMG-RXT' and v_dx = 'J20.9'
                         then 'Refuerzo broncovascular bilateral, sin consolidaciones ni derrame pleural. Silueta cardiaca de tamaño normal. Conclusión: hallazgos compatibles con proceso bronquial; correlacionar con la clínica.'
                         else v_cat.normal_report end,
           reported_by = 'Dr. Raúl Mendieta Flores · Radiología'
     where id = v_ord.id returning * into v_ord;
  end if;

  return v_ord;
end $$;

-- ---------- RPC para la app ----------
create or replace function request_studies(p_encounter_id uuid, p_study_codes text[], p_note text default null)
returns setof diagnostic_orders
language plpgsql set search_path = public
as $$
declare v_enc encounters;
begin
  select * into v_enc from encounters where id = p_encounter_id;
  if not found then raise exception 'Atención no encontrada'; end if;
  if coalesce(array_length(p_study_codes, 1), 0) = 0 then raise exception 'Seleccione al menos un estudio'; end if;

  return query
  insert into diagnostic_orders (patient_id, encounter_id, doctor_id, study_code, clinical_note)
  select v_enc.patient_id, v_enc.id, v_enc.doctor_id, c, p_note
  from unnest(p_study_codes) c
  returning *;
end $$;

-- Botón "Registrar resultado (simulado)" de la demo.
create or replace function register_simulated_result(p_order_id uuid)
returns diagnostic_orders
language sql security definer set search_path = public
as $$ select * from _simulate_result(p_order_id, now()) $$;

-- ---------- Vistas ----------
create or replace view v_diagnostic_orders with (security_invoker = true) as
select o.*, c.name as study_name, c.kind, c.loinc, c.image_path, c.image_credit,
       d.full_name as doctor_name,
       (select count(*) from lab_results r where r.order_id = o.id and r.flag <> 'normal') as abnormal_count
from diagnostic_orders o
join study_catalog c on c.code = o.study_code
left join doctors d on d.id = o.doctor_id;

create or replace view v_lab_results with (security_invoker = true) as
select r.*, o.patient_id, o.study_code, c.name as study_name, o.resulted_at
from lab_results r
join diagnostic_orders o on o.id = r.order_id
join study_catalog c on c.code = o.study_code;

-- Tratamiento actual: última indicación de cada medicamento cuya duración sigue vigente
-- (con 10 días de margen para la renovación de crónicos).
create or replace view v_current_medication with (security_invoker = true) as
select distinct on (rx.patient_id, pi.medication_code)
       rx.patient_id, pi.medication_code, m.name as medication_name, m.concentration, m.form,
       pi.dose, pi.frequency, pi.duration_days, rx.issued_at, rx.folio,
       d.full_name as doctor_name,
       ((rx.issued_at at time zone 'America/La_Paz')::date + coalesce(pi.duration_days, 0)) as ends_on
from prescription_items pi
join prescriptions rx on rx.id = pi.prescription_id
join medications m    on m.code = pi.medication_code
join doctors d        on d.id = rx.doctor_id
where rx.status <> 'anulada'
  and (rx.issued_at at time zone 'America/La_Paz')::date + coalesce(pi.duration_days, 0) + 10 >= bo_today()
order by rx.patient_id, pi.medication_code, rx.issued_at desc;

-- ---------- Acceso (mismo esquema abierto de la demo) ----------
do $$
declare t text;
begin
  foreach t in array array['study_catalog', 'diagnostic_orders', 'lab_results'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists demo_full_access on %I', t);
    execute format('create policy demo_full_access on %I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;
grant select, insert, update, delete on study_catalog, diagnostic_orders, lab_results to anon, authenticated;
grant select on v_diagnostic_orders, v_lab_results, v_current_medication to anon, authenticated;
grant execute on function request_studies(uuid, text[], text), register_simulated_result(uuid) to anon, authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'diagnostic_orders') then
    alter publication supabase_realtime add table diagnostic_orders;
  end if;
end $$;

-- ---------- reset_demo(): el reset existente pasa a ser el "núcleo" y se le agregan los extras ----------
do $$
begin
  if not exists (select 1 from pg_proc where proname = '_reset_core') then
    alter function reset_demo() rename to _reset_core;
  end if;
end $$;
revoke execute on function _reset_core() from public, anon, authenticated;
revoke execute on function _simulate_result(uuid, timestamptz) from public, anon, authenticated;

create or replace function reset_demo() returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_core  jsonb;
  v_hero  uuid;
  v_vill  uuid;
  v_encs  uuid[];
  v_enc   record;
  v_ord   uuid;
  v_i     int;
begin
  v_core := _reset_core();          -- truncate de patients/encounters arrastra (cascade) exámenes
  perform setseed(0.26102026);
  truncate study_catalog cascade;

  insert into study_catalog (code, name, kind, loinc, analytes, normal_report, image_path, image_credit) values
    ('LAB-GLU',   'Glucosa en ayunas',           'laboratorio', '1558-6',
      '[{"code":"GLU","name":"Glucosa en ayunas","unit":"mg/dL","low":70,"high":100}]', null, null, null),
    ('LAB-HBA1C', 'Hemoglobina glicosilada (HbA1c)', 'laboratorio', '4548-4',
      '[{"code":"HBA1C","name":"HbA1c","unit":"%","low":4.0,"high":5.6}]', null, null, null),
    ('LAB-LIP',   'Perfil lipídico',             'laboratorio', '57698-3',
      '[{"code":"CT","name":"Colesterol total","unit":"mg/dL","low":null,"high":200},
        {"code":"LDL","name":"Colesterol LDL","unit":"mg/dL","low":null,"high":130},
        {"code":"HDL","name":"Colesterol HDL","unit":"mg/dL","low":40,"high":null},
        {"code":"TG","name":"Triglicéridos","unit":"mg/dL","low":null,"high":150}]', null, null, null),
    ('LAB-REN',   'Función renal',               'laboratorio', '2160-0',
      '[{"code":"CREA","name":"Creatinina","unit":"mg/dL","low":0.5,"high":1.1},
        {"code":"UREA","name":"Urea","unit":"mg/dL","low":15,"high":45}]', null, null, null),
    ('LAB-HEM',   'Hemograma',                   'laboratorio', '58410-2',
      '[{"code":"HB","name":"Hemoglobina","unit":"g/dL","low":12,"high":16},
        {"code":"LEU","name":"Leucocitos","unit":"10³/µL","low":4.5,"high":11},
        {"code":"PLT","name":"Plaquetas","unit":"10³/µL","low":150,"high":450}]', null, null, null),
    ('LAB-TSH',   'TSH (hormona estimulante de tiroides)', 'laboratorio', '3016-3',
      '[{"code":"TSH","name":"TSH","unit":"µUI/mL","low":0.4,"high":4.0}]', null, null, null),
    ('LAB-EGO',   'Examen general de orina',     'laboratorio', '24356-8',
      '[{"code":"DENS","name":"Densidad","unit":"","low":1.005,"high":1.030},
        {"code":"LEUO","name":"Leucocitos en orina","unit":"/campo","low":0,"high":5}]', null, null, null),
    ('IMG-RXT',   'Rayos X de tórax PA',         'imagen', '36643-5', null,
      'Campos pulmonares sin infiltrados ni consolidaciones. Silueta cardiaca de tamaño normal (índice cardiotorácico < 0,5). Senos costofrénicos libres. Estructuras óseas sin alteraciones. Conclusión: estudio dentro de límites normales.',
      '/studies/rx-torax-pa.jpg', 'Imagen: CDC / Dr. Jack Poland (PHIL 17298). Uso educativo.'),
    ('IMG-RXR',   'Rayos X de rodilla AP y lateral', 'imagen', null, null,
      'Disminución del espacio articular femorotibial medial y osteofitos marginales. Sin fracturas. Conclusión: cambios degenerativos compatibles con gonartrosis grado II.',
      null, null),
    ('IMG-ECO',   'Ecografía abdominal',         'imagen', null, null,
      'Hígado de tamaño y ecogenicidad normales. Vías biliares no dilatadas. Riñones de forma y tamaño conservados. Conclusión: estudio sin alteraciones significativas.',
      null, null);

  -- ---------- Antecedentes ----------
  select id into v_hero from patients where matricula = 'CBA-104523';
  select id into v_vill from doctors  where license_number = 'MP-C-4471';

  update patients set
    personal_history = 'Hipertensión arterial diagnosticada en 2015. Diabetes mellitus tipo 2 diagnosticada en 2019.',
    surgical_history = 'Colecistectomía laparoscópica (2010).',
    family_history   = 'Madre con diabetes tipo 2. Padre fallecido por infarto agudo de miocardio a los 67 años.',
    habits           = 'No fuma. Alcohol ocasional. Actividad física escasa (camina dos veces por semana).'
  where id = v_hero;

  update patients set
    personal_history = case when cardinality(chronic_conditions) > 0
                            then array_to_string(chronic_conditions, ' y ') || ' en control.'
                            when birth_date > bo_today() - 14 * 365 then 'Vacunas al día según carné.'
                            else 'Sin antecedentes patológicos de importancia.' end,
    surgical_history = _pick(array['Ninguno.', 'Ninguno.', 'Ninguno.', 'Apendicectomía.', 'Cesárea.', 'Hernioplastia inguinal.']),
    family_history   = _pick(array['Sin antecedentes de importancia.', 'Padre con hipertensión arterial.',
                               'Madre con diabetes tipo 2.', 'Abuela con cáncer de mama.', 'No refiere.']),
    habits           = case when birth_date > bo_today() - 14 * 365 then 'Alimentación acorde a la edad.'
                            else _pick(array['No fuma. Alcohol ocasional.', 'No fuma. No consume alcohol.',
                                             'Fuma 5 cigarrillos al día.', 'Sedentarismo. Alcohol los fines de semana.']) end
  where id <> v_hero;

  -- ---------- Exámenes de María Elena (coherentes con sus notas de consulta) ----------
  select array_agg(id order by started_at) into v_encs from encounters where patient_id = v_hero;

  -- A) Laboratorio e imagen previos al 1er control (resultado 3 días antes de la consulta)
  for v_ord in
    insert into diagnostic_orders (patient_id, encounter_id, doctor_id, study_code, clinical_note, requested_at)
    select v_hero, null, v_vill, c, 'Control de HTA y DM2',
           (select started_at from encounters where id = v_encs[1]) - interval '5 days'
    from unnest(array['LAB-GLU','LAB-HBA1C','LAB-REN','IMG-RXT']) c
    returning id
  loop
    perform _simulate_result(v_ord, (select requested_at from diagnostic_orders where id = v_ord) + interval '2 days');
  end loop;

  -- B) Control antes del 2º control (sin consulta asociada)
  for v_ord in
    insert into diagnostic_orders (patient_id, encounter_id, doctor_id, study_code, clinical_note, requested_at)
    select v_hero, null, v_vill, c, 'Control trimestral de glucemia',
           (select started_at from encounters where id = v_encs[2]) - interval '4 days'
    from unnest(array['LAB-GLU','LAB-HBA1C']) c
    returning id
  loop
    perform _simulate_result(v_ord, (select requested_at from diagnostic_orders where id = v_ord) + interval '1 day');
  end loop;

  -- C) Pedido en el 2º control, resultado antes del 3º (LDL 162 citado en la nota)
  for v_ord in
    insert into diagnostic_orders (patient_id, encounter_id, doctor_id, study_code, clinical_note, requested_at)
    select v_hero, v_encs[2], v_vill, c, 'Evaluación de riesgo cardiovascular',
           (select started_at from encounters where id = v_encs[2]) + interval '20 min'
    from unnest(array['LAB-LIP','LAB-GLU']) c
    returning id
  loop
    perform _simulate_result(v_ord, (select started_at from encounters where id = v_encs[3]) - interval '3 days');
  end loop;

  -- Valores exactos citados en las notas clínicas
  update lab_results r set value = x.v
  from (values (1, 'GLU', 168), (1, 'HBA1C', 7.9), (1, 'CREA', 0.9), (1, 'UREA', 31),
               (2, 'GLU', 142), (2, 'HBA1C', 7.4),
               (3, 'GLU', 136), (3, 'CT', 238), (3, 'LDL', 162), (3, 'HDL', 41), (3, 'TG', 176)) as x(grp, code, v),
       diagnostic_orders o
  where o.id = r.order_id and o.patient_id = v_hero and r.analyte_code = x.code
    and o.clinical_note = (array['Control de HTA y DM2', 'Control trimestral de glucemia', 'Evaluación de riesgo cardiovascular'])[x.grp];

  -- D) Pedidos en el 3er control, aún pendientes → se completan en vivo
  insert into diagnostic_orders (patient_id, encounter_id, doctor_id, study_code, clinical_note, requested_at)
  select v_hero, v_encs[3], v_vill, c, 'Control de HbA1c y función renal tras ajuste de tratamiento',
         (select started_at from encounters where id = v_encs[3]) + interval '20 min'
  from unnest(array['LAB-HBA1C','LAB-REN']) c;

  -- ---------- Exámenes del resto de pacientes (~35 % de atenciones con diagnóstico que lo amerita) ----------
  for v_enc in
    select e.id, e.patient_id, e.doctor_id, e.finished_at, e.diagnosis_code
    from encounters e
    where e.patient_id <> v_hero and e.finished_at is not null
      and e.diagnosis_code in ('I10','E11.9','E78.5','E03.9','D50.9','N39.0','J20.9','M17.9')
      and random() < 0.35
    order by e.started_at
  loop
    for v_ord in
      insert into diagnostic_orders (patient_id, encounter_id, doctor_id, study_code, requested_at)
      select v_enc.patient_id, v_enc.id, v_enc.doctor_id, c, v_enc.finished_at
      from unnest(case v_enc.diagnosis_code
                    when 'I10'   then array['LAB-REN']
                    when 'E11.9' then array['LAB-GLU','LAB-HBA1C']
                    when 'E78.5' then array['LAB-LIP']
                    when 'E03.9' then array['LAB-TSH']
                    when 'D50.9' then array['LAB-HEM']
                    when 'N39.0' then array['LAB-EGO']
                    when 'J20.9' then array['IMG-RXT']
                    else array['IMG-RXR'] end) c
      returning id
    loop
      v_i := 1 + floor(random() * 3)::int;              -- resultado 1–3 días después
      if v_enc.finished_at + make_interval(days => v_i) < now() then
        perform _simulate_result(v_ord, v_enc.finished_at + make_interval(days => v_i));
      end if;
    end loop;
  end loop;

  return v_core || jsonb_build_object(
    'diagnostic_orders', (select count(*) from diagnostic_orders),
    'lab_results',       (select count(*) from lab_results),
    'pending_orders',    (select count(*) from diagnostic_orders where status = 'solicitado'));
end $$;

grant execute on function reset_demo() to anon, authenticated;
