# CORDES · Demo funcional

Demo web para la **Caja de Salud CORDES – Regional Cochabamba** (OMICRON Consultores + Chemonics International).
Objetivo: mostrar en vivo un flujo integrado y coherente, donde cada acción se refleja en los demás módulos:

**Cita → Atención médica (HCE) → Receta digital → Farmacia → Dispensación → Inventario → Indicadores**

Es una **demo**, no un sistema productivo: rápida de construir, vistosa, simple y bien hecha. Plazo: 5 jornadas.
Ante la duda, elegir siempre lo más simple que funcione bien en la presentación.

## Stack

- Next.js (App Router) + TypeScript estricto + Tailwind CSS + shadcn/ui + lucide-react
- Supabase (PostgreSQL) vía `@supabase/supabase-js` con la **publishable key** `sb_publishable_…` (sin login; equivale a la antigua anon key → rol `anon`)
- Recharts para gráficos · date-fns (locale `es`) para fechas · Zod para validar formularios
- Deploy: Netlify (repo GitHub `omicron-consultores/cordes-demo`) → `omicron-cordes-demo.netlify.app`
- No agregar dependencias nuevas sin una razón clara.

## Base de datos (fuente de verdad: `supabase/migrations/`)

- `…01_schema.sql` tablas · `…02_logic.sql` funciones RPC y vistas · `…03_seed.sql` `reset_demo()`
- `supabase/tests/flujo_demo.sql`: prueba de punta a punta (corre en transacción y hace rollback).
- Documentación del modelo: `docs/modelo-datos.md`.

**Reglas de acceso a datos**
- **Lecturas**: desde las vistas `v_*` (ya traen nombres unidos y estados calculados).
- **Escrituras de negocio: SOLO por RPC** (`supabase.rpc(...)`), nunca `insert/update` directo en esas tablas:
  `book_appointment`, `reschedule_appointment`, `cancel_appointment`, `mark_no_show`,
  `start_encounter`, `complete_encounter`, `dispense_prescription`, `cancel_prescription`,
  `receive_stock`, `write_off_expired_lot`, `reset_demo`. La lógica y las validaciones viven en la BD.
- Excepción permitida: editar datos de contacto del paciente (`patients.phone/email/address`) con `update` directo.
- Los errores de las RPC llegan en español (`raise exception`): mostrarlos tal cual en un toast.
- Tipos: `lib/database.types.ts` generado con `npx supabase gen types typescript --project-id <id>`. No escribir tipos de tablas a mano.
- Zona horaria de negocio: `America/La_Paz` (UTC−4). Usar `bo_today()` en SQL; en el front, formatear siempre en esa zona.
- Realtime habilitado en `appointments`, `prescriptions`, `stock_lots`: la bandeja de Farmacia y el dashboard se suscriben y se refrescan solos (efecto demo entre dos dispositivos).

## Datos

- **Reales**: catálogo de 47 medicamentos (código, nombre, presentación, P.U., saldo inicial = inventario de Farmacia Planta Central al 31/12/2025) y nombres de establecimientos.
- **Ficticios**: pacientes, médicos, citas, atenciones, recetas, lotes y vencimientos.
- Nunca introducir personas reales ni datos personales reales.
- Paciente protagonista: **María Elena Quispe Rojas** (matrícula `CBA-104523`, HTA + DM2, **alérgica a penicilinas**), médico por defecto **Dr. Jorge Andrés Villarroel Soria** (Medicina Interna, Cala Cala).
- Casos sembrados para la presentación: receta pediátrica con Dicloxacilina suspensión (solo 2 frascos → dispensación parcial), una receta ya parcial, lote de Azitromicina vencido sin baja, 5 lotes por vencer en menos de 90 días, Insulina glargina y Amoxicilina suspensión bajo mínimo.

## Roles y rutas

Sin autenticación. La pantalla `/` es un **selector de rol** (y de persona: paciente o médico); la elección se guarda en una cookie `demo_role` / `demo_actor` para que funcione con Server Components. En la cabecera siempre hay un selector para cambiar de rol y un menú con **"Reiniciar demo"** (llama `reset_demo()`, pide confirmación).

| Rol | Rutas | Dispositivo |
|---|---|---|
| Paciente | `/paciente` (inicio: próxima cita y receta lista), `/paciente/citas` (listar, **agendar**, reprogramar, cancelar), `/paciente/historial` (atenciones y recetas, solo lectura), `/paciente/perfil` | **Mobile-first** (diseñar a 390 px; navegación inferior) |
| Admisión | `/admision`: agenda del día por establecimiento y médico, agendar por ventanilla, marcar no asistió | Escritorio |
| Médico | `/medico` (agenda del día) → `/medico/atencion/[id]` (antecedentes, historial, signos vitales, CIE-10, receta) | Escritorio |
| Farmacia | `/farmacia` (bandeja de recetas) → `/farmacia/receta/[id]` (dispensar); `/farmacia/inventario` (stock, lotes, vencimientos, ingreso, baja) | Escritorio |
| Gerencia | `/gerencia`: KPIs del día, actividad 30 días, top medicamentos, diagnósticos, alertas | Escritorio |

Escritorio también debe verse correcto en tablet; el rol Paciente debe verse correcto en escritorio (columna centrada).

## Comportamientos clave (lo que se muestra en la demo)

1. El paciente agenda desde el móvil → la cita aparece en la agenda del médico y de Admisión.
2. El médico atiende: ve alergias y condiciones crónicas destacadas arriba. Si receta un medicamento cuyo `allergen_group` está en `patients.allergies`, se muestra **alerta bloqueante** (permitir continuar solo confirmando).
3. Al recetar, mostrar el stock disponible de cada medicamento en el buscador.
4. Al cerrar la atención (`complete_encounter`), la receta entra en la bandeja de Farmacia **sin recargar** (realtime).
5. Farmacia dispensa (`dispense_prescription`, FEFO por lote). Si falta stock → resultado "parcial" con el faltante explícito.
6. El inventario y el dashboard reflejan el descuento al instante. El paciente ve su receta como "Lista para recoger / Entregada".

## Diseño

- Institucional, limpio, sobrio. Mucho espacio en blanco, jerarquía clara, números grandes en KPIs.
- Paleta CORDES: primario `#0b8377` (verde azulado), acento `#f46f14` (naranja), fondo `#f5f7f6`, texto `#0f2430`. Estados: ok `#2c6349`, alerta `#b07d2a`, crítico `#96261c`.
- Tipografía: Inter o la de shadcn por defecto. Cifras con `tabular-nums`.
- Logos en `public/brand/`: `cordes.png`, `chemonics.png`, `omicron.png`, `omicron-white.png` (sobre fondos oscuros).
- Leyenda "Demo · datos ficticios" **casi invisible**: texto pequeño y gris en el pie, nunca un banner.
- Usuarios con poca experiencia tecnológica: botones grandes en móvil, textos claros, sin jerga.

## Convenciones

- Interfaz 100 % en español (Bolivia). Moneda `Bs 1.234,50` (`Intl.NumberFormat('es-BO')`). Fechas `lunes 21 de octubre, 09:20`.
- Folio de receta: `RX-000123` (ya viene como `folio_label` en las vistas).
- Componentes de servidor para leer; Server Actions o handlers de cliente para llamar RPC; `revalidatePath` tras escribir.
- Estructura: `app/(roles)/…`, `components/ui` (shadcn), `components/<dominio>/…`, `lib/supabase.ts`, `lib/format.ts`.
- Variables de entorno: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (en `.env.local` y en Netlify). Nunca usar en el front ni commitear la secret key (`sb_secret_…`).
- Commits pequeños, uno por funcionalidad, en español.

## Fuera de alcance (no construir)

Login/roles reales, integraciones con sistemas de CORDES, migración de historias clínicas, facturación o prestadores externos, telemedicina, notificaciones reales (SMS/email), multi-farmacia, i18n, tests E2E. Si una tarea lo requiere, detenerse y preguntar.

## Riesgos aceptados (demo)

La URL es pública y la publishable key permite leer y escribir todas las tablas (RLS con política abierta). Solo hay datos ficticios y el botón "Reiniciar demo" restaura todo. **No reutilizar este esquema de acceso en un sistema real.**
Supabase (plan gratuito) pausa el proyecto tras 7 días sin actividad: antes de cada presentación, abrir el panel de Supabase, reactivar si hace falta y ejecutar "Reiniciar demo".
