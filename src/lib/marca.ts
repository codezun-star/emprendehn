// Colores de marca para contextos donde no aplica Tailwind (metadata, imágenes
// Open Graph generadas, plantillas de correo). Deben coincidir con @theme en globals.css.
export const COLORES = {
  brandDark: "#0f3d5e",
  brand: "#1b6fa8",
  brandLight: "#f2f6f8",
  accent: "#ff7a3d",
  ink: "#1a1a1a",
  bandera: "#0073cf",
} as const;

// Logo "HN" dentro de la bandera de Honduras (azul-blanco-azul), en un lienzo de
// 64×64: H azul sobre la franja blanca y N blanca en un recuadro azul. Lo usan
// el componente MarcaHN (sitio), el ícono de Apple y la imagen Open Graph.
// src/app/icon.svg es una copia de svgMarca() (regenerarla si cambia algo aquí).

const BANDA = 11;

/** Franjas azules de arriba y abajo, recortadas por las esquinas redondeadas. */
export function franjasMarca(radio: number): [string, string] {
  if (radio === 0) return [`M0 0H64V${BANDA}H0Z`, `M0 ${64 - BANDA}H64V64H0Z`];
  const x = +(radio - Math.sqrt(radio ** 2 - (radio - BANDA) ** 2)).toFixed(3);
  const r = `${radio} ${radio} 0 0 1`;
  return [
    `M${x} ${BANDA}A${r} ${radio} 0H${64 - radio}A${r} ${64 - x} ${BANDA}Z`,
    `M${x} ${64 - BANDA}H${64 - x}A${r} ${64 - radio} 64H${radio}A${r} ${x} ${64 - BANDA}Z`,
  ];
}

export const TRAZOS_MARCA = {
  h: "M8 21h6v8.5h7V21h6v22h-6v-8.5h-7V43H8z",
  recuadroN: { x: 31, y: 16, width: 26, height: 32, rx: 5 },
  n: "M36.5 21h5l6 12V21h5v22h-5l-6-12v12h-5z",
} as const;

/** El logo como SVG (texto), para imágenes generadas. radio 0 = cuadrado (iOS redondea el suyo). */
export function svgMarca(radio = 14): string {
  const [arriba, abajo] = franjasMarca(radio);
  const { x, y, width, height, rx } = TRAZOS_MARCA.recuadroN;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="${radio}" fill="#fff"/><path fill="${COLORES.bandera}" d="${arriba}"/><path fill="${COLORES.bandera}" d="${abajo}"/><path fill="${COLORES.bandera}" d="${TRAZOS_MARCA.h}"/><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${rx}" fill="${COLORES.bandera}"/><path fill="#fff" d="${TRAZOS_MARCA.n}"/></svg>`;
}

export function uriMarca(radio = 14): string {
  return `data:image/svg+xml,${encodeURIComponent(svgMarca(radio))}`;
}
