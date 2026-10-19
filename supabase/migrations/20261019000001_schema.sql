-- =====================================================================
-- CORDES · Demo funcional · 01 · Esquema
-- Flujo: Cita → Atención (HCE) → Receta → Farmacia → Dispensación → Inventario → Indicadores
-- Datos de pacientes y médicos: FICTICIOS. Catálogo de medicamentos: inventario real de
-- Farmacia Planta Central al 31/12/2025 (respuesta formal de CORDES, sep-2026).
-- =====================================================================

-- ---------- Utilidades de zona horaria (Bolivia, UTC-4) ----------
create or replace function bo_today() returns date
language sql stable set search_path = public
as $$ select (now() at time zone 'America/La_Paz')::date $$;

-- ---------- Tipos ----------
create type appointment_status  as enum ('programada', 'en_atencion', 'atendida', 'cancelada', 'no_asistio');
create type appointment_channel as enum ('app', 'ventanilla', 'telefono');
create type prescription_status as enum ('emitida', 'parcial', 'dispensada', 'anulada');
create type movement_type       as enum ('ingreso', 'dispensacion', 'ajuste', 'baja_vencimiento');

-- ---------- Catálogos (clave natural legible) ----------
create table establishments (
  code        text primary key,                 -- p. ej. 'CC-MI'
  name        text not null,
  zone        text not null,                    -- Cala Cala, Quillacollo, Sacaba, Trópico
  kind        text not null check (kind in ('hospital', 'policlinico')),
  active      boolean not null default true
);

create table specialties (
  code  text primary key,                       -- 'MG', 'MI', 'PED'...
  name  text not null
);

create table cie10 (
  code   text primary key,                      -- CIE-10 (OMS)
  label  text not null
);

create table medications (
  code              text primary key,           -- código real del kardex CORDES (p. ej. 'C-09-02')
  name              text not null,
  form              text not null,              -- Comprimido, Cápsula, Frasco, Tubo, Inyectable...
  concentration     text,
  category          text not null,              -- grupo terapéutico (letra del código)
  unit_price        numeric(12,2) not null check (unit_price >= 0),   -- P.U. real (Bs)
  min_stock         integer not null default 0 check (min_stock >= 0),
  high_rotation     boolean not null default false,
  allergen_group    text,                       -- p. ej. 'penicilinas' → alerta cruzada con alergias del paciente
  active            boolean not null default true
);

create table doctors (
  id                  uuid primary key default gen_random_uuid(),
  full_name           text not null,
  specialty_code      text not null references specialties(code),
  establishment_code  text not null references establishments(code),
  license_number      text not null,
  active              boolean not null default true
);

-- ---------- Pacientes (asegurados) ----------
create table patients (
  id                   uuid primary key default gen_random_uuid(),
  matricula            text not null unique,
  first_names          text not null,
  last_names           text not null,
  birth_date           date not null,
  sex                  char(1) not null check (sex in ('F', 'M')),
  phone                text,
  email                text,
  address              text,
  insured_type         text not null check (insured_type in ('titular', 'beneficiario')),
  affiliation_sector   text not null check (affiliation_sector in ('Público', 'Privado', 'Voluntario', 'Pasivo')),
  blood_type           text,
  allergies            text[] not null default '{}',       -- usa los mismos valores que medications.allergen_group
  chronic_conditions   text[] not null default '{}',
  home_establishment   text references establishments(code),
  created_at           timestamptz not null default now()
);

-- ---------- Citas ----------
create table appointments (
  id                  uuid primary key default gen_random_uuid(),
  patient_id          uuid not null references patients(id) on delete cascade,
  doctor_id           uuid not null references doctors(id),
  establishment_code  text not null references establishments(code),
  scheduled_at        timestamptz not null,
  duration_min        smallint not null default 20,
  status              appointment_status not null default 'programada',
  channel             appointment_channel not null default 'app',
  reason              text,
  cancel_reason       text,
  reschedule_count    smallint not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
-- Un médico no puede tener dos citas activas en el mismo horario.
create unique index appointments_doctor_slot_uq
  on appointments (doctor_id, scheduled_at)
  where status in ('programada', 'en_atencion', 'atendida');
create index appointments_patient_idx on appointments (patient_id, scheduled_at desc);
create index appointments_day_idx     on appointments (scheduled_at);

-- ---------- Atención médica / Historia Clínica ----------
create table encounters (
  id                  uuid primary key default gen_random_uuid(),
  appointment_id      uuid unique references appointments(id) on delete set null,
  patient_id          uuid not null references patients(id) on delete cascade,
  doctor_id           uuid not null references doctors(id),
  establishment_code  text not null references establishments(code),
  started_at          timestamptz not null default now(),
  finished_at         timestamptz,
  chief_complaint     text,                -- motivo de consulta
  weight_kg           numeric(5,1),
  height_cm           numeric(5,1),
  bp_systolic         smallint,
  bp_diastolic        smallint,
  heart_rate          smallint,
  temperature_c       numeric(3,1),
  findings            text,                -- examen físico / evolución
  diagnosis_code      text references cie10(code),
  diagnosis_notes     text,
  plan                text
);
create index encounters_patient_idx on encounters (patient_id, started_at desc);

-- ---------- Recetas ----------
create table prescriptions (
  id              uuid primary key default gen_random_uuid(),
  folio           bigint generated always as identity unique,   -- se muestra como RX-000123
  encounter_id    uuid not null unique references encounters(id) on delete cascade,
  patient_id      uuid not null references patients(id) on delete cascade,
  doctor_id       uuid not null references doctors(id),
  status          prescription_status not null default 'emitida',
  issued_at       timestamptz not null default now(),
  last_dispensed_at timestamptz,
  dispensed_at    timestamptz,                                   -- cuando queda completa
  notes           text
);
create index prescriptions_status_idx on prescriptions (status, issued_at);

create table prescription_items (
  id                   uuid primary key default gen_random_uuid(),
  prescription_id      uuid not null references prescriptions(id) on delete cascade,
  line_no              smallint not null,
  medication_code      text not null references medications(code),
  dose                 text not null,          -- '1 comprimido'
  frequency            text not null,          -- 'cada 8 horas'
  duration_days        smallint,
  quantity_prescribed  integer not null check (quantity_prescribed > 0),
  quantity_dispensed   integer not null default 0,
  instructions         text,
  unique (prescription_id, line_no),
  check (quantity_dispensed between 0 and quantity_prescribed)
);

-- ---------- Inventario (Farmacia Planta Central) ----------
create table stock_lots (
  id               uuid primary key default gen_random_uuid(),
  medication_code  text not null references medications(code),
  lot_number       text not null,
  expires_at       date not null,
  quantity         integer not null check (quantity >= 0),
  received_at      date not null default bo_today(),
  unique (medication_code, lot_number)
);
create index stock_lots_fefo_idx on stock_lots (medication_code, expires_at) where quantity > 0;

-- Kardex: toda variación de stock deja un movimiento (cantidad con signo: + entra, − sale).
create table inventory_movements (
  id                    uuid primary key default gen_random_uuid(),
  medication_code       text not null references medications(code),
  lot_id                uuid references stock_lots(id) on delete set null,
  type                  movement_type not null,
  quantity              integer not null check (quantity <> 0),
  prescription_item_id  uuid references prescription_items(id) on delete set null,
  actor                 text,
  note                  text,
  created_at            timestamptz not null default now()
);
create index inventory_movements_med_idx on inventory_movements (medication_code, created_at desc);
create index inventory_movements_day_idx on inventory_movements (created_at);
