import "server-only";

// Correos transaccionales de la aplicación (Resend). NO implementado en el MVP.
//
// · Los correos de autenticación (confirmación, recuperación) los envía
//   Supabase Auth: para producción, configurar Resend como SMTP en el
//   dashboard de Supabase (ver README). No requiere código.
// · Para notificaciones propias (p. ej. "tu negocio fue aprobado"):
//   1. npm install resend  y definir RESEND_API_KEY
//   2. implementar enviarNotificacion con el SDK de Resend
//   3. llamarla desde lib/acciones/admin.ts → moderarNegocio (marcado con TODO(email))

export type Notificacion =
  | { tipo: "negocio_aprobado"; para: string; nombreNegocio: string; url: string }
  | { tipo: "negocio_rechazado"; para: string; nombreNegocio: string; motivo: string };

export async function enviarNotificacion(notificacion: Notificacion): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    console.info("[email] (no implementado)", notificacion.tipo, notificacion.para);
  }
}
