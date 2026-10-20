/** Aviso cuando Supabase no responde (p. ej. proyecto pausado). */
export function DataError({ message }: { message?: string }) {
  return (
    <p className="rounded-xl border border-critical/30 bg-critical/5 p-4 text-critical">
      {message ?? "No se pudieron cargar los datos. Intente de nuevo en un momento."}
    </p>
  )
}
