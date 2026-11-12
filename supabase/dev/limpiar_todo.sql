-- Elimina TODO lo que crean las migraciones de la demo, para volver a instalar desde cero.
-- Seguro de ejecutar varias veces. No toca nada de Supabase (auth, storage, etc.).
alter table if exists patients drop column if exists personal_history, drop column if exists surgical_history, drop column if exists family_history, drop column if exists habits;
drop table if exists inventory_movements, stock_lots, prescription_items, prescriptions, encounters,
                     appointments, patients, doctors, medications, cie10, specialties, establishments cascade;
drop type if exists appointment_status, appointment_channel, prescription_status, movement_type cascade;
drop table if exists lab_results, diagnostic_orders, study_catalog cascade;
drop function if exists reset_demo(), _reset_core(), _simulate_result(uuid, timestamptz), request_studies(uuid, text[], text), register_simulated_result(uuid), _pick(anyarray), bo_today(), available_slots(uuid, date), day_slots(date), demo_schedule(),
                        start_encounter(uuid), complete_encounter(uuid, jsonb, jsonb, text),
                        dispense_prescription(uuid, jsonb, text, timestamptz) cascade;
