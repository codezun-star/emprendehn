// Teléfonos de Honduras: 8 dígitos. Se guardan en formato E.164 (+504XXXXXXXX).

/** "9999-8888", "+504 9999 8888", "50499998888" -> "99998888" (o null si no es válido). */
export function extraerDigitosHN(entrada: string): string | null {
  const digitos = entrada.replace(/\D/g, "").replace(/^504(?=\d{8}$)/, "");
  return /^[2-9]\d{7}$/.test(digitos) ? digitos : null;
}

/** "+50499998888" -> "9999-8888" (para mostrar). */
export function formatearTelefono(e164: string): string {
  const digitos = e164.replace(/^\+504/, "");
  return digitos.length === 8 ? `${digitos.slice(0, 4)}-${digitos.slice(4)}` : e164;
}

/** Enlace de WhatsApp con mensaje prellenado. */
export function enlaceWhatsApp(e164: string, mensaje: string): string {
  const numero = e164.replace(/\D/g, "");
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}
