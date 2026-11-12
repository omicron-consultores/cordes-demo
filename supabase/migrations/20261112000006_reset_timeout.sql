-- =====================================================================
-- CORDES · Demo funcional · 06 · Tiempo máximo de reset_demo()
--
-- Con la 005 (antecedentes + exámenes), reset_demo() tarda más que el
-- statement_timeout del rol anon en Supabase (3 s) y el botón "Reiniciar demo"
-- fallaba con "canceling statement due to statement timeout".
--
-- PostgREST aplica el statement_timeout declarado en la función al llamarla por
-- RPC, así que se amplía SOLO para reset_demo(); el resto de las RPC conserva
-- el límite normal del rol.
-- =====================================================================

alter function reset_demo() set statement_timeout = '60s';

-- PostgREST cachea la definición de las funciones: recargarla para que tome el cambio.
notify pgrst, 'reload schema';
