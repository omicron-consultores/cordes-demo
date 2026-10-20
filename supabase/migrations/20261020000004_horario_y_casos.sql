-- =====================================================================
-- CORDES · Demo funcional · 04 · Horario configurable + más casos de demo
--
-- Cambios respecto a 03:
--   1. Horario de consulta en UN solo lugar: demo_schedule(). Ahora 08:00–19:00,
--      cupos de 20 min (33 cupos). available_slots() y reset_demo() lo usan.
--   2. María Elena tiene su control HOY, en el primer cupo libre ≥ 30 min después
--      del reset (o el siguiente día hábil si ya no hay horario hoy) → el médico
--      siempre puede atenderla en vivo.
--   3. Más estados sembrados: citas reprogramadas y una receta anulada.
--
-- Para cambiar el horario en el futuro: editar SOLO demo_schedule() y ejecutar reset_demo().
--
-- Origen de los datos:
--   · Establecimientos: nombres usados en el prototipo presentado a CORDES (ago-2026).
--   · Medicamentos: código, nombre, presentación, P.U. y saldo REALES del inventario
--     de Farmacia Planta Central al 31/12/2025 (oficio de Farmacia, sep-2026).
--   · Lotes y vencimientos: SIMULADOS (el inventario no los detalla).
--   · Pacientes, médicos, citas, atenciones y recetas: FICTICIOS.
-- =====================================================================

-- Horario de consulta externa (lun–vie). Único lugar donde se define.
create or replace function demo_schedule(out start_time time, out end_time time, out slot_minutes int)
language sql immutable set search_path = public
as $$ select time '08:00', time '19:00', 20 $$;

-- Todos los cupos de un día (sin filtrar ocupados ni pasados). Vacío en fin de semana.
create or replace function day_slots(p_date date)
returns table (slot timestamptz)
language sql stable set search_path = public
as $$
  select ((p_date + s.start_time + make_interval(mins => g * s.slot_minutes)) at time zone 'America/La_Paz')
  from demo_schedule() s,
       generate_series(0, (extract(epoch from (s.end_time - s.start_time)) / 60 / s.slot_minutes)::int - 1) g
  where extract(isodow from p_date) < 6
  order by 1
$$;

create or replace function available_slots(p_doctor_id uuid, p_date date)
returns table (slot timestamptz)
language sql stable set search_path = public
as $$
  select d.slot
  from day_slots(p_date) d
  where d.slot > now()
    and not exists (
      select 1 from appointments a
      where a.doctor_id = p_doctor_id
        and a.scheduled_at = d.slot
        and a.status in ('programada', 'en_atencion', 'atendida')
    )
  order by d.slot
$$;

create or replace function _pick(anyarray) returns anyelement
language sql volatile set search_path = public
as $$ select $1[1 + floor(random() * array_length($1, 1))::int] $$;

create or replace function reset_demo() returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_today      date := bo_today();
  v_day        date;
  v_at         timestamptz;
  v_doc        record;
  v_pat        uuid;
  v_appt       uuid;
  v_enc        uuid;
  v_rx         uuid;
  v_dx         text;
  v_status     appointment_status;
  v_r          float8;
  v_age        int;
  v_sex        char(1);
  v_is_child   boolean;
  v_slot       int;
  v_k          int;
  v_line       int;
  v_med        record;
  v_lot1       int;
  v_hero       uuid;
  v_villarroel uuid;
  v_mendoza    uuid;
  v_children   uuid[];
  v_women      uuid[];
  v_adults     uuid[];
  v_started    timestamptz;
  v_finished   timestamptz;
  v_pending_ids uuid[];
  v_i          int;
  f_names text[] := array['María','Ana','Carmen','Rosa','Lucía','Gabriela','Daniela','Sofía','Valeria','Paola',
                          'Silvia','Marcela','Juana','Teresa','Elizabeth','Ximena','Natalia','Andrea','Mónica','Rocío'];
  m_names text[] := array['Juan','José','Carlos','Luis','Jorge','Miguel','Fernando','Roberto','Diego','Mario',
                          'Alejandro','Pablo','Sergio','Víctor','Raúl','Gonzalo','Rodrigo','Iván','Óscar','Marco'];
  fc_names text[] := array['Camila','Valentina','Isabella','Luciana','Mía','Abril','Antonella','Emilia'];
  mc_names text[] := array['Mateo','Santiago','Thiago','Sebastián','Joaquín','Gael','Benjamín','Lucas'];
  surnames text[] := array['Quispe','Mamani','Rojas','Vargas','Flores','Choque','Gutiérrez','Fernández','Arce',
                           'Camacho','Torrico','Zurita','Montaño','Soria','Villarroel','Herbas','Orellana','Céspedes',
                           'Terrazas','Ledezma','Galarza','Rocha','Siles','Ferrufino','Coca','Guzmán','Salvatierra',
                           'Veizaga','Escóbar','Meneses'];
  streets text[] := array['Av. América','Calle Jordán','Av. Blanco Galindo','Av. Ayacucho','Calle Lanza','Av. Heroínas',
                          'Av. Melchor Pérez','Calle Baptista','Av. Circunvalación','Av. Martín Cárdenas','Av. Villazón'];
  zones text[] := array['Cala Cala','Queru Queru','Sarco','Muyurina','Las Cuadras','Tupuraya','Quillacollo','Sacaba','Tiquipaya'];
begin
  perform setseed(0.19102026);

  truncate inventory_movements, prescription_items, prescriptions, encounters, appointments,
           stock_lots, patients, doctors, medications, cie10, specialties, establishments
           restart identity cascade;

  -- ------------------------------------------------------------------
  -- Catálogos
  -- ------------------------------------------------------------------
  insert into establishments (code, name, zone, kind) values
    ('CC-MI',   'Medicina Interna',           'Cala Cala',   'hospital'),
    ('CC-PED',  'Pediatría',                  'Cala Cala',   'hospital'),
    ('CC-EQ',   'Especialidades Quirúrgicas', 'Cala Cala',   'hospital'),
    ('POL-QUI', 'Policlínico Quillacollo',    'Quillacollo', 'policlinico'),
    ('POL-SAC', 'Policlínico Sacaba',         'Sacaba',      'policlinico'),
    ('POL-CHI', 'Policlínico Chimoré',        'Trópico',     'policlinico');

  insert into specialties (code, name) values
    ('MG', 'Medicina General'), ('MI', 'Medicina Interna'), ('PED', 'Pediatría'),
    ('TRA', 'Traumatología'), ('GIN', 'Ginecología');

  insert into doctors (full_name, specialty_code, establishment_code, license_number) values
    ('Dr. Jorge Andrés Villarroel Soria', 'MI',  'CC-MI',   'MP-C-4471'),
    ('Dra. Patricia Gutiérrez Camacho',   'MI',  'CC-MI',   'MP-C-3982'),
    ('Dra. Carla Mendoza Arnez',          'PED', 'CC-PED',  'MP-C-5120'),
    ('Dr. Luis Fernando Torrico Vela',    'PED', 'CC-PED',  'MP-C-4876'),
    ('Dr. Ricardo Salazar Pinto',         'TRA', 'CC-EQ',   'MP-C-3655'),
    ('Dra. Verónica Arandia Lara',        'GIN', 'CC-EQ',   'MP-C-5034'),
    ('Dr. Hugo Claros Montaño',           'MG',  'POL-QUI', 'MP-C-4210'),
    ('Dra. Sandra Quiroga Peña',          'MG',  'POL-QUI', 'MP-C-5298'),
    ('Dr. Fabián Coca Herrera',           'MG',  'POL-SAC', 'MP-C-4655'),
    ('Dra. Lourdes Paniagua Ríos',        'MG',  'POL-SAC', 'MP-C-5402'),
    ('Dr. Wilson Choque Mamani',          'MG',  'POL-CHI', 'MP-C-4933');
  select id into v_villarroel from doctors where license_number = 'MP-C-4471';
  select id into v_mendoza    from doctors where license_number = 'MP-C-5120';

  insert into cie10 (code, label) values
    ('I10',   'Hipertensión esencial (primaria)'),
    ('E11.9', 'Diabetes mellitus tipo 2 sin complicaciones'),
    ('E78.5', 'Hiperlipidemia no especificada'),
    ('E03.9', 'Hipotiroidismo no especificado'),
    ('J06.9', 'Infección aguda de las vías respiratorias superiores'),
    ('J02.9', 'Faringitis aguda no especificada'),
    ('J20.9', 'Bronquitis aguda no especificada'),
    ('J45.9', 'Asma no especificada'),
    ('K29.7', 'Gastritis no especificada'),
    ('A09',   'Diarrea y gastroenteritis de presunto origen infeccioso'),
    ('N39.0', 'Infección de vías urinarias, sitio no especificado'),
    ('M54.5', 'Lumbago no especificado'),
    ('M17.9', 'Gonartrosis no especificada'),
    ('S93.4', 'Esguince y torcedura del tobillo'),
    ('R51',   'Cefalea'),
    ('L30.9', 'Dermatitis no especificada'),
    ('L08.9', 'Infección local de la piel y del tejido subcutáneo'),
    ('D50.9', 'Anemia por deficiencia de hierro'),
    ('F41.1', 'Trastorno de ansiedad generalizada'),
    ('B37.3', 'Candidiasis de la vulva y de la vagina'),
    ('Z34.9', 'Supervisión de embarazo normal'),
    ('Z00.0', 'Examen médico general');

  -- Catálogo real (Farmacia Planta Central, inventario 31/12/2025). saldo = punto de partida.
  create temp table tmp_med (code text, name text, form text, conc text, category text,
                             pu numeric, saldo int, min_stock int, allergen text) on commit drop;
  insert into tmp_med values
    ('A-02-02','Omeprazol','Cápsula','20 mg','Digestivo',0.56,46513,3000,null),
    ('A-03-06','Domperidona','Comprimido','10 mg','Digestivo',0.56,13669,800,null),
    ('A-03-13','Simeticona','Comprimido','100 mg','Digestivo',1.12,5644,400,null),
    ('A-07-06','Sales de rehidratación oral (SRO) baja osmolaridad','Sobre',null,'Digestivo',1.61,1213,300,null),
    ('A-10-01','Glibenclamida','Comprimido','5 mg','Metabolismo',0.10,23579,1500,null),
    ('A-10-04','Metformina','Comprimido','850 mg','Metabolismo',0.89,87085,5000,null),
    ('A-10-05','Insulina glargina','Inyectable','100 UI/ml','Metabolismo',349.01,136,150,null),
    ('A-11-09','Multivitaminas','Comprimido',null,'Metabolismo',0.79,32567,1500,null),
    ('A-12-02','Calcio + Vitamina D','Comprimido',null,'Metabolismo',0.69,16340,1000,null),
    ('B-01-01','Ácido acetilsalicílico','Comprimido','100 mg','Sangre',0.28,12405,800,'aine'),
    ('B-01-06','Clopidogrel','Comprimido','75 mg','Sangre',2.02,1087,150,null),
    ('B-03-01','Ácido fólico','Comprimido','5 mg','Sangre',0.11,12205,600,null),
    ('B-03-08','Sulfato ferroso + ácido fólico','Comprimido','200 mg + 0,5 mg','Sangre',0.39,11501,800,null),
    ('C-03-04','Furosemida','Comprimido','40 mg','Cardiovascular',0.32,4629,300,null),
    ('C-07-04','Carvedilol','Comprimido','6,25 mg','Cardiovascular',0.61,13642,800,null),
    ('C-08-07','Amlodipino','Comprimido','10 mg','Cardiovascular',0.30,12726,1000,null),
    ('C-09-01','Enalapril maleato','Comprimido','10 mg','Cardiovascular',0.22,2741,400,null),
    ('C-09-02','Losartán','Comprimido','50 mg','Cardiovascular',0.45,95467,6000,null),
    ('C-10-01','Atorvastatina','Comprimido','10 mg','Cardiovascular',0.96,12931,1000,null),
    ('D-07-01','Betametasona (valerato) pomada','Tubo','0,1 %','Dermatológico',9.39,312,60,null),
    ('H-02-08','Prednisona','Comprimido','5 mg','Hormonal',0.38,6522,400,null),
    ('H-03-01','Levotiroxina sódica','Comprimido','100 mcg','Hormonal',0.71,3328,300,null),
    ('J-01-06','Amoxicilina','Comprimido','500 mg','Antiinfeccioso',0.97,2708,600,'penicilinas'),
    ('J-01-09','Amoxicilina + inhibidor de betalactamasa','Comprimido','500 mg + 125 mg','Antiinfeccioso',4.74,11084,800,'penicilinas'),
    ('J-01-13','Azitromicina','Comprimido','500 mg','Antiinfeccioso',2.75,8139,600,null),
    ('J-01-23','Cefalexina-Cefradina','Cápsula','500 mg','Antiinfeccioso',2.38,4245,400,null),
    ('J-01-27','Ciprofloxacina','Comprimido','500 mg','Antiinfeccioso',0.69,7511,500,null),
    ('J-01-37','Cotrimoxazol (sulfametoxazol + trimetoprim)','Comprimido','800 mg + 160 mg','Antiinfeccioso',0.53,2280,300,null),
    ('J-01-42','Dicloxacilina sódica suspensión','Frasco','250 mg/5 ml','Antiinfeccioso',15.79,2,20,'penicilinas'),
    ('J-01-51','Nitrofurantoína','Comprimido','100 mg','Antiinfeccioso',1.19,1918,300,null),
    ('J-01-57','Amoxicilina suspensión','Frasco','500 mg/5 ml','Antiinfeccioso',12.54,189,200,'penicilinas'),
    ('J-02-08','Fluconazol','Comprimido','150 mg','Antiinfeccioso',2.80,1257,100,null),
    ('M-01-01','Diclofenaco gel','Tubo','1 %','Musculoesquelético',11.01,2921,200,'aine'),
    ('M-01-02','Diclofenaco sódico','Comprimido','50 mg','Musculoesquelético',0.12,14864,1000,'aine'),
    ('M-01-04','Ibuprofeno suspensión','Frasco','100 mg/5 ml','Musculoesquelético',6.31,1777,150,'aine'),
    ('M-01-05','Ibuprofeno','Comprimido','400 mg','Musculoesquelético',0.30,60246,3000,'aine'),
    ('M-01-11','Meloxicam','Comprimido','15 mg','Musculoesquelético',1.02,23931,1200,'aine'),
    ('N-02-08','Paracetamol (acetaminofeno)','Comprimido','500 mg','Sistema nervioso',0.14,18983,2000,null),
    ('N-02-09','Paracetamol (acetaminofeno) jarabe','Frasco','125 mg/5 ml','Sistema nervioso',6.35,784,150,null),
    ('N-02-15','Tramadol','Comprimido','50 mg','Sistema nervioso',1.99,8204,400,null),
    ('N-06-04','Fluoxetina','Comprimido','20 mg','Sistema nervioso',0.93,19402,800,null),
    ('P-01-09','Metronidazol','Comprimido','500 mg','Antiparasitario',0.57,3908,300,null),
    ('R-03-03B','Beclometasona dipropionato aerosol','Frasco','50 mcg/inhalación','Respiratorio',113.15,625,60,null),
    ('R-03-06','Salbutamol inhalador','Frasco','0,1 mg/inhalación','Respiratorio',18.99,590,80,null),
    ('R-05-01','Antigripal (paracetamol + antihistamínico + vasoconstrictor)','Comprimido',null,'Respiratorio',0.53,31938,1500,null),
    ('R-05-03','Dextrometorfano bromhidrato jarabe','Frasco','10 mg/5 ml','Respiratorio',9.58,2473,150,null),
    ('R-06-07','Cetirizina','Comprimido','10 mg','Respiratorio',0.40,29701,1200,null);

  insert into medications (code, name, form, concentration, category, unit_price, min_stock, high_rotation, allergen_group)
  select code, name, form, conc, category, pu, min_stock, saldo >= 10000, allergen from tmp_med;

  -- Lotes simulados: el saldo real se reparte en 2 lotes (uno más próximo a vencer).
  for v_med in select * from tmp_med loop
    if v_med.saldo <= 200 then
      insert into stock_lots (medication_code, lot_number, expires_at, quantity, received_at)
      values (v_med.code, 'L' || to_char(v_today - 120, 'YYMM') || '-' || upper(substr(md5(v_med.code || 'a'), 1, 4)),
              v_today + 150 + floor(random() * 120)::int, v_med.saldo, v_today - 120);
    else
      v_lot1 := round(v_med.saldo * 0.35);
      insert into stock_lots (medication_code, lot_number, expires_at, quantity, received_at) values
        (v_med.code, 'L' || to_char(v_today - 170, 'YYMM') || '-' || upper(substr(md5(v_med.code || 'a'), 1, 4)),
         v_today + 120 + floor(random() * 200)::int, v_lot1, v_today - 150 - floor(random() * 60)::int),
        (v_med.code, 'L' || to_char(v_today - 55, 'YYMM') || '-' || upper(substr(md5(v_med.code || 'b'), 1, 4)),
         v_today + 400 + floor(random() * 320)::int, v_med.saldo - v_lot1, v_today - 40 - floor(random() * 30)::int);
    end if;
  end loop;

  -- Casos de vencimiento para la demo (lote más antiguo de cada medicamento).
  update stock_lots l set expires_at = v_today + x.days
  from (values ('J-01-09', 25), ('M-01-04', 18), ('J-01-27', 40), ('N-02-09', 52), ('C-09-01', 70)) as x(code, days)
  where l.medication_code = x.code
    and l.received_at = (select min(received_at) from stock_lots where medication_code = x.code);

  -- Un lote ya vencido y aún sin dar de baja (alerta).
  insert into stock_lots (medication_code, lot_number, expires_at, quantity, received_at)
  values ('J-01-13', 'L' || to_char(v_today - 330, 'YYMM') || '-VX7Q', v_today - 6, 120, v_today - 330);

  insert into inventory_movements (medication_code, lot_id, type, quantity, actor, note, created_at)
  select medication_code, id, 'ingreso', quantity, 'Almacén central', 'Ingreso lote ' || lot_number,
         (received_at + time '10:00') at time zone 'America/La_Paz'
  from stock_lots;

  -- ------------------------------------------------------------------
  -- Plantillas clínicas (motivo, hallazgos, plan) y recetas tipo por diagnóstico
  -- ------------------------------------------------------------------
  create temp table tmp_dx (code text primary key, reason text, findings text, plan text) on commit drop;
  insert into tmp_dx values
    ('I10','Control de presión arterial','Paciente asintomático. Ruidos cardiacos rítmicos, sin soplos.','Continuar tratamiento antihipertensivo. Dieta hiposódica. Control en 30 días.'),
    ('E11.9','Control de diabetes','Glucemia capilar elevada. Pies sin lesiones.','Ajuste de dieta y actividad física. Control de HbA1c en 3 meses.'),
    ('E78.5','Revisión de laboratorio','Perfil lipídico con LDL elevado.','Inicia estatina. Control de perfil lipídico en 3 meses.'),
    ('E03.9','Control de tiroides','TSH elevada en último control.','Ajuste de levotiroxina. Control de TSH en 6 semanas.'),
    ('J06.9','Tos y congestión nasal','Rinorrea, faringe congestiva, pulmones limpios.','Tratamiento sintomático e hidratación. Volver si hay fiebre persistente.'),
    ('J02.9','Dolor de garganta y fiebre','Amígdalas hipertróficas con exudado.','Antibiótico por 7 días. Control si no mejora en 72 h.'),
    ('J20.9','Tos productiva','Roncus difusos, sin signos de dificultad respiratoria.','Tratamiento por 5 días. Control en una semana.'),
    ('J45.9','Dificultad para respirar','Sibilancias espiratorias leves.','Broncodilatador según necesidad. Técnica inhalatoria explicada.'),
    ('K29.7','Dolor de estómago','Dolor epigástrico a la palpación, sin signos de alarma.','Inhibidor de bomba de protones 30 días. Evitar irritantes.'),
    ('A09','Diarrea','Mucosas semihúmedas, abdomen blando y depresible.','Rehidratación oral. Signos de alarma explicados.'),
    ('N39.0','Ardor al orinar','Puño percusión negativa. Examen de orina compatible.','Antibiótico 7 días. Abundantes líquidos.'),
    ('M54.5','Dolor de espalda','Contractura paravertebral lumbar, Lasègue negativo.','Analgesia y reposo relativo. Ejercicios de columna.'),
    ('M17.9','Dolor de rodilla','Crepitación en rodilla, sin derrame articular.','Analgesia y fisioterapia. Control en 30 días.'),
    ('S93.4','Torcedura de tobillo','Edema perimaleolar lateral, sin deformidad.','Inmovilización, hielo y elevación. Control en 7 días.'),
    ('R51','Dolor de cabeza','Examen neurológico sin alteraciones.','Analgesia. Registro de episodios.'),
    ('L30.9','Lesiones en la piel','Placas eritematosas descamativas.','Corticoide tópico 10 días. Evitar jabones irritantes.'),
    ('L08.9','Lesión infectada en la piel','Lesión costrosa con halo eritematoso.','Antibiótico oral. Higiene local.'),
    ('D50.9','Cansancio','Palidez de mucosas. Hemoglobina baja en laboratorio.','Suplemento de hierro 60 días. Control de hemograma.'),
    ('F41.1','Ansiedad e insomnio','Paciente orientada, ansiosa.','Inicia tratamiento. Derivación a psicología.'),
    ('B37.3','Molestia vaginal','Secreción blanquecina grumosa.','Antifúngico dosis única.'),
    ('Z34.9','Control prenatal','Altura uterina acorde a edad gestacional.','Suplementos. Próximo control en 4 semanas.'),
    ('Z00.0','Chequeo general','Examen físico sin alteraciones.','Recomendaciones de estilo de vida saludable.');

  create temp table tmp_rx (dx text, child boolean, med text, dose text, freq text, days int, qty int) on commit drop;
  insert into tmp_rx values
    ('I10',false,'C-09-02','1 comprimido','cada 24 horas',30,30),
    ('I10',false,'C-08-07','1 comprimido','cada 24 horas',30,30),
    ('E11.9',false,'A-10-04','1 comprimido','cada 12 horas',30,60),
    ('E11.9',false,'A-10-01','1 comprimido','cada 24 horas',30,30),
    ('E78.5',false,'C-10-01','1 comprimido','cada 24 horas (noche)',30,30),
    ('E03.9',false,'H-03-01','1 comprimido','cada 24 horas en ayunas',30,30),
    ('J06.9',false,'N-02-08','1 comprimido','cada 8 horas',5,15),
    ('J06.9',false,'R-05-01','1 comprimido','cada 8 horas',5,15),
    ('J06.9',false,'R-06-07','1 comprimido','cada 24 horas',7,7),
    ('J02.9',false,'J-01-06','1 comprimido','cada 8 horas',7,21),
    ('J02.9',false,'M-01-05','1 comprimido','cada 8 horas',5,15),
    ('J20.9',false,'J-01-13','1 comprimido','cada 24 horas',3,3),
    ('J20.9',false,'R-05-03','10 ml','cada 8 horas',5,1),
    ('J45.9',false,'R-03-06','2 inhalaciones','cada 6 horas si hay crisis',30,1),
    ('J45.9',false,'R-03-03B','2 inhalaciones','cada 12 horas',30,1),
    ('K29.7',false,'A-02-02','1 cápsula','cada 24 horas en ayunas',30,30),
    ('K29.7',false,'A-03-06','1 comprimido','antes de cada comida',10,30),
    ('A09',false,'A-07-06','1 sobre en 1 litro de agua','a libre demanda',3,4),
    ('A09',false,'P-01-09','1 comprimido','cada 8 horas',7,21),
    ('N39.0',false,'J-01-51','1 comprimido','cada 6 horas',5,20),
    ('N39.0',false,'J-01-27','1 comprimido','cada 12 horas',7,14),
    ('M54.5',false,'M-01-02','1 comprimido','cada 12 horas',7,14),
    ('M54.5',false,'M-01-11','1 comprimido','cada 24 horas',10,10),
    ('M54.5',false,'N-02-15','1 comprimido','cada 12 horas',5,10),
    ('M17.9',false,'M-01-11','1 comprimido','cada 24 horas',30,30),
    ('M17.9',false,'M-01-01','aplicación local','cada 8 horas',15,1),
    ('S93.4',false,'M-01-02','1 comprimido','cada 12 horas',5,10),
    ('S93.4',false,'M-01-01','aplicación local','cada 8 horas',10,1),
    ('R51',false,'N-02-08','1 comprimido','cada 8 horas',3,9),
    ('R51',false,'M-01-05','1 comprimido','cada 8 horas',3,9),
    ('L30.9',false,'D-07-01','aplicación local','cada 12 horas',10,1),
    ('D50.9',false,'B-03-08','1 comprimido','cada 24 horas',60,60),
    ('F41.1',false,'N-06-04','1 comprimido','cada 24 horas (mañana)',30,30),
    ('B37.3',false,'J-02-08','1 comprimido','dosis única',1,1),
    ('Z34.9',false,'B-03-01','1 comprimido','cada 24 horas',30,30),
    ('Z34.9',false,'B-03-08','1 comprimido','cada 24 horas',30,30),
    ('J06.9',true,'N-02-09','5 ml','cada 8 horas',5,1),
    ('J02.9',true,'J-01-57','5 ml','cada 12 horas',7,1),
    ('J02.9',true,'M-01-04','5 ml','cada 8 horas',5,1),
    ('J20.9',true,'J-01-57','5 ml','cada 12 horas',7,1),
    ('J20.9',true,'N-02-09','5 ml','cada 8 horas',5,1),
    ('A09',true,'A-07-06','1 sobre en 1 litro de agua','a libre demanda',3,3),
    ('J45.9',true,'R-03-06','2 inhalaciones con espaciador','cada 6 horas si hay crisis',30,1),
    ('L30.9',true,'D-07-01','aplicación local','cada 12 horas',7,1),
    ('R51',true,'N-02-09','5 ml','cada 8 horas',3,1);

  -- ------------------------------------------------------------------
  -- Pacientes
  -- ------------------------------------------------------------------
  -- Paciente protagonista de la demo (vista móvil).
  insert into patients (matricula, first_names, last_names, birth_date, sex, phone, email, address,
                        insured_type, affiliation_sector, blood_type, allergies, chronic_conditions, home_establishment)
  values ('CBA-104523', 'María Elena', 'Quispe Rojas', date '1968-04-12', 'F', '71745320',
          'maria.quispe@correo.demo', 'Calle Baptista N° 512, zona Cala Cala',
          'titular', 'Público', 'O+', array['penicilinas'],
          array['Hipertensión arterial', 'Diabetes mellitus tipo 2'], 'CC-MI')
  returning id into v_hero;

  for v_i in 2..130 loop
    v_is_child := v_i <= 34;
    if v_is_child then
      v_age := 1 + floor(random() * 13)::int;
      v_sex := case when random() < 0.5 then 'F' else 'M' end;
    else
      v_age := 19 + floor(random() * 60)::int;
      v_sex := case when random() < 0.55 then 'F' else 'M' end;
    end if;

    insert into patients (matricula, first_names, last_names, birth_date, sex, phone, address,
                          insured_type, affiliation_sector, blood_type, allergies, chronic_conditions, home_establishment)
    values (
      'CBA-' || (100000 + (v_i * 7919) % 900000)::text,
      case when v_is_child and v_sex = 'F' then _pick(fc_names)
           when v_is_child then _pick(mc_names)
           when v_sex = 'F' then _pick(f_names) || case when random() < 0.4 then ' ' || _pick(f_names) else '' end
           else _pick(m_names) || case when random() < 0.4 then ' ' || _pick(m_names) else '' end end,
      _pick(surnames) || ' ' || _pick(surnames),
      v_today - (v_age * 365 + floor(random() * 300)::int),
      v_sex,
      '7' || lpad(floor(random() * 9999999)::text, 7, '0'),
      _pick(streets) || ' N° ' || (100 + floor(random() * 1800)::int) || ', zona ' || _pick(zones),
      case when v_is_child then 'beneficiario' when random() < 0.7 then 'titular' else 'beneficiario' end,
      case when not v_is_child and v_age > 60 and random() < 0.5 then 'Pasivo'
           else _pick(array['Privado','Privado','Privado','Privado','Privado','Privado','Público','Público','Voluntario']) end,
      _pick(array['O+','O+','O+','O+','O+','O+','A+','A+','B+','O-','AB+']),
      case when random() < 0.08 then array['penicilinas'] when random() < 0.03 then array['aine'] else '{}' end,
      case when not v_is_child and v_age > 45 then
             array_remove(array[case when random() < 0.30 then 'Hipertensión arterial' end,
                                 case when random() < 0.20 then 'Diabetes mellitus tipo 2' end], null)
           when v_is_child and random() < 0.08 then array['Asma bronquial']
           else '{}' end,
      _pick(array['CC-MI','CC-MI','CC-PED','POL-QUI','POL-SAC','POL-CHI'])
    );
  end loop;

  select array_agg(id) into v_children from patients where birth_date > v_today - 14 * 365;
  select array_agg(id) into v_women    from patients where sex = 'F' and birth_date between v_today - 50 * 365 and v_today - 18 * 365 and id <> v_hero;
  select array_agg(id) into v_adults   from patients where birth_date <= v_today - 18 * 365 and id <> v_hero;

  -- ------------------------------------------------------------------
  -- Historia de la paciente protagonista (3 controles + 1 cita cancelada + 1 cita futura)
  -- ------------------------------------------------------------------
  for v_i in 1..3 loop
    v_day := v_today - (array[88, 58, 28])[v_i];
    while extract(isodow from v_day) > 5 loop v_day := v_day - 1; end loop;
    v_at := (v_day + time '09:00') at time zone 'America/La_Paz';
    v_dx := (array['I10', 'E11.9', 'I10'])[v_i];

    insert into appointments (patient_id, doctor_id, establishment_code, scheduled_at, status, channel, reason, created_at)
    values (v_hero, v_villarroel, 'CC-MI', v_at, 'atendida', (array['ventanilla','app','app'])[v_i]::appointment_channel,
            (select reason from tmp_dx where code = v_dx), v_at - interval '6 days')
    returning id into v_appt;

    insert into encounters (appointment_id, patient_id, doctor_id, establishment_code, started_at, finished_at,
                            chief_complaint, weight_kg, height_cm, bp_systolic, bp_diastolic, heart_rate, temperature_c,
                            findings, diagnosis_code, diagnosis_notes, plan)
    values (v_appt, v_hero, v_villarroel, 'CC-MI', v_at + interval '5 min', v_at + interval '22 min',
            (select reason from tmp_dx where code = v_dx),
            (array[78.4, 77.6, 76.9])[v_i], 156, (array[152, 144, 136])[v_i], (array[96, 90, 86])[v_i],
            (array[82, 78, 76])[v_i], 36.6,
            (array['PA elevada. Refiere cefalea ocasional. Glucemia en ayunas 168 mg/dl.',
                   'Glucemia en ayunas 142 mg/dl. HbA1c 7,4 %. Buena adherencia.',
                   'PA en mejoría. LDL 162 mg/dl en laboratorio reciente.'])[v_i],
            v_dx,
            (array['HTA no controlada en paciente con DM2.', 'DM2 en control parcial.', 'HTA en mejoría. Dislipidemia asociada.'])[v_i],
            (array['Ajusta antihipertensivo, continúa metformina. Control en 30 días.',
                   'Refuerzo de dieta. Continúa esquema. Control en 30 días.',
                   'Continúa esquema e inicia atorvastatina. Control en 30 días.'])[v_i])
    returning id into v_enc;

    insert into prescriptions (encounter_id, patient_id, doctor_id, issued_at)
    values (v_enc, v_hero, v_villarroel, v_at + interval '22 min') returning id into v_rx;

    insert into prescription_items (prescription_id, line_no, medication_code, dose, frequency, duration_days, quantity_prescribed)
    values (v_rx, 1, 'C-09-02', '1 comprimido', 'cada 24 horas', 30, 30),
           (v_rx, 2, 'A-10-04', '1 comprimido', 'cada 12 horas', 30, 60);
    if v_i = 3 then
      insert into prescription_items (prescription_id, line_no, medication_code, dose, frequency, duration_days, quantity_prescribed)
      values (v_rx, 3, 'C-10-01', '1 comprimido', 'cada 24 horas (noche)', 30, 30);
    end if;
  end loop;

  v_day := v_today - 40;
  while extract(isodow from v_day) > 5 loop v_day := v_day - 1; end loop;
  insert into appointments (patient_id, doctor_id, establishment_code, scheduled_at, status, channel, reason, cancel_reason, created_at)
  values (v_hero, v_villarroel, 'CC-MI', (v_day + time '10:20') at time zone 'America/La_Paz', 'cancelada', 'app',
          'Control de presión arterial', 'Viaje imprevisto', (v_day - 5 + time '18:00') at time zone 'America/La_Paz');

  -- Control de HOY con el Dr. Villarroel: primer cupo ≥ 30 min después del reset;
  -- si hoy ya no hay horario (o es fin de semana), primer cupo del siguiente día hábil.
  select s.slot into v_at
  from generate_series(v_today, v_today + 7, interval '1 day') d,
       lateral day_slots(d::date) s
  where s.slot >= now() + interval '30 min'
  order by s.slot limit 1;
  insert into appointments (patient_id, doctor_id, establishment_code, scheduled_at, status, channel, reason, created_at)
  values (v_hero, v_villarroel, 'CC-MI', v_at, 'programada', 'app',
          'Control de presión y glucemia', now() - interval '3 days');

  -- ------------------------------------------------------------------
  -- Actividad de los últimos 30 días + hoy + próximos 10 días hábiles
  -- ------------------------------------------------------------------
  for v_day in select d::date from generate_series(v_today - 30, v_today + 14, interval '1 day') d loop
    continue when extract(isodow from v_day) > 5;

    for v_doc in select d.id, d.specialty_code, d.establishment_code from doctors d order by d.license_number loop
      -- Ocupación ≈ 25 % del día en el pasado/hoy, ≈ 15 % en días futuros (volumen similar a 03).
      v_k := case when v_day <= v_today then 6 + floor(random() * 4)::int else 3 + floor(random() * 4)::int end;

      for v_at in select s.slot from day_slots(v_day) s order by random() limit v_k loop
        continue when exists (select 1 from appointments a where a.doctor_id = v_doc.id and a.scheduled_at = v_at);

        -- Paciente y diagnóstico según especialidad
        v_pat := case v_doc.specialty_code when 'PED' then _pick(v_children)
                                           when 'GIN' then _pick(v_women)
                                           else _pick(v_adults) end;
        v_dx := case v_doc.specialty_code
                  when 'MI'  then _pick(array['I10','I10','E11.9','E11.9','E78.5','K29.7','E03.9','F41.1','J20.9'])
                  when 'PED' then _pick(array['J06.9','J06.9','J02.9','J20.9','A09','J45.9','L30.9','R51'])
                  when 'TRA' then _pick(array['M54.5','M54.5','M17.9','S93.4'])
                  when 'GIN' then _pick(array['N39.0','B37.3','D50.9','Z34.9','Z34.9'])
                  else _pick(array['J06.9','J06.9','J02.9','K29.7','N39.0','M54.5','A09','R51','I10','E11.9','J20.9','L30.9','D50.9','Z00.0'])
                end;

        if v_at > now() then
          v_status := 'programada';
        else
          v_r := random();
          v_status := case when v_r < 0.07 then 'cancelada' when v_r < 0.17 then 'no_asistio' else 'atendida' end;
        end if;

        insert into appointments (patient_id, doctor_id, establishment_code, scheduled_at, status, channel, reason,
                                  cancel_reason, created_at, updated_at)
        values (v_pat, v_doc.id, v_doc.establishment_code, v_at, v_status,
                _pick(array['ventanilla','ventanilla','ventanilla','app','app','telefono'])::appointment_channel,
                (select reason from tmp_dx where code = v_dx),
                case when v_status = 'cancelada' then _pick(array['Paciente no puede asistir','Reprogramará más adelante','Mejoró de sus síntomas']) end,
                least(now(), v_at - make_interval(days => 1 + floor(random() * 10)::int)), least(now(), v_at))
        returning id into v_appt;

        continue when v_status <> 'atendida';

        v_is_child := v_doc.specialty_code = 'PED';
        select extract(year from age(v_day, birth_date))::int into v_age from patients where id = v_pat;
        v_started  := v_at + make_interval(mins => floor(random() * 15)::int);
        v_finished := v_started + make_interval(mins => 12 + floor(random() * 14)::int);

        insert into encounters (appointment_id, patient_id, doctor_id, establishment_code, started_at, finished_at,
                                chief_complaint, weight_kg, height_cm, bp_systolic, bp_diastolic, heart_rate, temperature_c,
                                findings, diagnosis_code, plan)
        select v_appt, v_pat, v_doc.id, v_doc.establishment_code, v_started, v_finished,
               t.reason,
               case when v_is_child then round((9 + v_age * 2.6 + random() * 4)::numeric, 1)
                    else round((55 + random() * 35)::numeric, 1) end,
               case when v_is_child then round((76 + v_age * 6 + random() * 6)::numeric, 1)
                    else round((150 + random() * 28)::numeric, 1) end,
               case when v_is_child then null else 110 + floor(random() * 40)::int end,
               case when v_is_child then null else 70 + floor(random() * 25)::int end,
               case when v_is_child then 85 + floor(random() * 30)::int else 64 + floor(random() * 30)::int end,
               case when v_dx in ('J02.9','J06.9','J20.9') then round((37.6 + random() * 1.3)::numeric, 1)
                    else round((36.2 + random() * 0.9)::numeric, 1) end,
               t.findings, v_dx, t.plan
        from tmp_dx t where t.code = v_dx
        returning id into v_enc;

        -- Receta: 1 o 2 líneas de la plantilla del diagnóstico (Z00.0 no lleva receta).
        if exists (select 1 from tmp_rx where dx = v_dx and child = v_is_child) then
          insert into prescriptions (encounter_id, patient_id, doctor_id, issued_at)
          values (v_enc, v_pat, v_doc.id, v_finished) returning id into v_rx;

          insert into prescription_items (prescription_id, line_no, medication_code, dose, frequency, duration_days, quantity_prescribed)
          select v_rx, row_number() over (), r.med, r.dose, r.freq, r.days, r.qty
          from (select * from tmp_rx where dx = v_dx and child = v_is_child order by random()
                limit 1 + floor(random() * 2)::int) r;
        end if;
      end loop;
    end loop;
  end loop;

  -- ------------------------------------------------------------------
  -- Dispensación histórica: todo lo emitido se dispensa (FEFO real),
  -- salvo las 6 recetas más recientes, que quedan en la bandeja de Farmacia.
  -- ------------------------------------------------------------------
  select array_agg(id) into v_pending_ids
  from (select id from prescriptions order by issued_at desc limit 6) x;

  -- Otros estados para que todo tenga ejemplos: ~8 % de citas reprogramadas y una receta anulada.
  update appointments set reschedule_count = 1 + floor(random() * 2)::int
  where random() < 0.08 and patient_id <> v_hero;

  update prescriptions set status = 'anulada', notes = 'Anulada por el médico: cambio de tratamiento'
  where id = (select id from prescriptions
              where id <> all (v_pending_ids) and issued_at < now() - interval '3 days'
              order by issued_at desc limit 1);

  for v_rx in select id from prescriptions where id <> all (v_pending_ids) and status = 'emitida' order by issued_at loop
    perform dispense_prescription(
      v_rx, null, 'Farmacia Planta Central',
      least(now(), (select issued_at from prescriptions where id = v_rx) + make_interval(mins => 15 + floor(random() * 75)::int)));
  end loop;

  -- Caso 1 (desabastecimiento): la receta pediátrica pendiente más reciente incluye
  -- Dicloxacilina suspensión, con solo 2 frascos en stock → dispensación parcial en vivo.
  select rx.id into v_rx
  from prescriptions rx join doctors d on d.id = rx.doctor_id
  where rx.id = any (v_pending_ids) and d.specialty_code = 'PED'
  order by rx.issued_at desc limit 1;

  if v_rx is null then          -- si no hay pediátrica pendiente, se usa la más reciente
    v_rx := v_pending_ids[1];
  end if;

  select coalesce(max(line_no), 0) + 1 into v_line from prescription_items where prescription_id = v_rx;
  insert into prescription_items (prescription_id, line_no, medication_code, dose, frequency, duration_days, quantity_prescribed, instructions)
  values (v_rx, v_line, 'J-01-42', '5 ml', 'cada 6 horas', 7, 3, 'Agitar antes de usar');
  update encounters set diagnosis_code = 'L08.9',
         findings = (select findings from tmp_dx where code = 'L08.9'),
         plan     = (select plan from tmp_dx where code = 'L08.9')
  where id = (select encounter_id from prescriptions where id = v_rx);

  -- Caso 2 (parcial ya registrado): otra receta pendiente con la primera línea entregada a medias.
  select id into v_rx from prescriptions
  where id = any (v_pending_ids)
    and id <> (select prescription_id from prescription_items where medication_code = 'J-01-42' and prescription_id = any (v_pending_ids) limit 1)
    and (select quantity_prescribed from prescription_items where prescription_id = prescriptions.id and line_no = 1) >= 2
  order by issued_at limit 1;

  if v_rx is not null then
    perform dispense_prescription(
      v_rx,
      (select jsonb_build_array(jsonb_build_object('item_id', id, 'quantity', quantity_prescribed / 2))
       from prescription_items where prescription_id = v_rx and line_no = 1),
      'Farmacia Planta Central',
      least(now(), (select issued_at from prescriptions where id = v_rx) + interval '20 min'));
  end if;

  return jsonb_build_object(
    'patients',      (select count(*) from patients),
    'doctors',       (select count(*) from doctors),
    'medications',   (select count(*) from medications),
    'appointments',  (select count(*) from appointments),
    'encounters',    (select count(*) from encounters),
    'prescriptions', (select count(*) from prescriptions),
    'pending_rx',    (select count(*) from prescriptions where status in ('emitida','parcial')),
    'movements',     (select count(*) from inventory_movements),
    'generated_at',  now());
end $$;

grant execute on function reset_demo() to anon, authenticated;
