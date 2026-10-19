import {
  BarChart3,
  ClipboardList,
  Pill,
  Smartphone,
  Stethoscope,
  type LucideIcon,
} from "lucide-react"

export const ROLE_KEYS = ["paciente", "medico", "admision", "farmacia", "gerencia"] as const
export type Role = (typeof ROLE_KEYS)[number]

export const ROLE_COOKIE = "demo_role"
export const ACTOR_COOKIE = "demo_actor"

// demo_actor guarda claves estables (reset_demo() regenera los UUID):
// paciente → patients.matricula · médico → doctors.license_number
export const DEFAULT_PATIENT = "CBA-104523" // María Elena Quispe Rojas
export const DEFAULT_DOCTOR = "MP-C-4471" // Dr. Jorge Andrés Villarroel Soria

export const ROLES: Record<
  Role,
  { label: string; description: string; device: "Móvil" | "Escritorio"; icon: LucideIcon }
> = {
  paciente: {
    label: "Paciente",
    description: "Agenda sus citas desde el celular y ve sus recetas e historial.",
    device: "Móvil",
    icon: Smartphone,
  },
  medico: {
    label: "Médico",
    description: "Atiende la agenda del día, registra la consulta y emite la receta digital.",
    device: "Escritorio",
    icon: Stethoscope,
  },
  admision: {
    label: "Admisión",
    description: "Agenda del día por establecimiento, citas por ventanilla e inasistencias.",
    device: "Escritorio",
    icon: ClipboardList,
  },
  farmacia: {
    label: "Farmacia",
    description: "Bandeja de recetas, dispensación por lote e inventario.",
    device: "Escritorio",
    icon: Pill,
  },
  gerencia: {
    label: "Gerencia",
    description: "Indicadores del día, actividad, medicamentos más usados y alertas.",
    device: "Escritorio",
    icon: BarChart3,
  },
}

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLE_KEYS as readonly string[]).includes(value)
}

export function needsActor(role: Role): role is "paciente" | "medico" {
  return role === "paciente" || role === "medico"
}

export function defaultActor(role: Role): string | null {
  if (role === "paciente") return DEFAULT_PATIENT
  if (role === "medico") return DEFAULT_DOCTOR
  return null
}
