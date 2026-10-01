#!/usr/bin/env node
// Revisa que nada se desborde en pantallas de celular: abre cada página en
// varios anchos (320–430 px) y reporta
//   - la página entera más ancha que la pantalla (scroll horizontal),
//   - elementos que se salen de la pantalla,
//   - texto o contenido más ancho que su caja (p. ej. una palabra larga en una tarjeta).
// Lo que está dentro de algo con scroll horizontal o recortado a propósito
// (truncate, line-clamp, overflow-hidden) no cuenta.
//
// Uso (con el sitio corriendo: npm run dev o npm start):
//   npm run revisar:desborde
//   URL_BASE=http://localhost:3001 npm run revisar:desborde -- /negocio/mi-negocio /panel
// La primera vez: npx playwright install chromium

import { chromium } from "playwright-core";

const BASE = (process.env.URL_BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const ANCHOS = [320, 360, 390, 430];
const RUTAS = [
  "/",
  "/categorias",
  "/categoria/automotriz",
  "/categoria/servicios-profesionales",
  "/buscar",
  "/buscar?q=pan",
  "/contacto",
  "/privacidad",
  "/terminos",
  "/ingresar",
  "/registro",
  "/recuperar-contrasena",
  "/esta-pagina-no-existe",
];

/** Corre dentro de la página: devuelve los desbordes encontrados. */
function buscarDesbordes() {
  const ancho = document.documentElement.clientWidth;
  const problemas = [];
  const describir = (el) => {
    const clases = typeof el.className === "string" ? el.className.trim().split(/\s+/).slice(0, 4).join(".") : "";
    const texto = (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 50);
    return `<${el.tagName.toLowerCase()}${clases ? "." + clases : ""}>${texto ? ` "${texto}"` : ""}`;
  };
  const recorta = (el) => getComputedStyle(el).overflowX !== "visible";
  const dentroDeRecorte = (el) => {
    for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) if (recorta(a)) return true;
    return false;
  };

  if (document.documentElement.scrollWidth > ancho + 1) {
    problemas.push({ el: null, motivo: `la página mide ${document.documentElement.scrollWidth}px de ancho (pantalla: ${ancho}px)` });
  }

  for (const el of document.body.querySelectorAll("*")) {
    if (el.getClientRects().length === 0) continue; // display: none (o un <dialog> cerrado)
    const estilo = getComputedStyle(el);
    if (estilo.visibility === "hidden" || estilo.position === "fixed") continue;
    if (el.closest("svg") && el.tagName.toLowerCase() !== "svg") continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    // Escondido a propósito del todo a la izquierda (p. ej. el campo trampa antispam): no da scroll.
    if (r.right <= 0) continue;
    const recortado = dentroDeRecorte(el);

    if (!recortado && (r.right > ancho + 1 || r.left < -1)) {
      problemas.push({ el, motivo: `se sale de la pantalla (${Math.round(r.left)}–${Math.round(r.right)}px)` });
    } else if (
      !recortado &&
      !recorta(el) &&
      !["INPUT", "SELECT", "TEXTAREA", "IMG", "VIDEO", "IFRAME"].includes(el.tagName) &&
      el.clientWidth > 0 &&
      el.scrollWidth > el.clientWidth + 1
    ) {
      problemas.push({ el, motivo: `su contenido mide ${el.scrollWidth}px y la caja ${el.clientWidth}px` });
    }
  }

  // Solo el más interno: si un hijo ya se desborda, el padre lo hereda.
  const conElemento = problemas.filter((p) => p.el);
  return problemas
    .filter((p) => !p.el || !conElemento.some((o) => o !== p && p.el.contains(o.el)))
    .map((p) => ({ elemento: p.el ? describir(p.el) : "(página)", motivo: p.motivo }));
}

const rutas = process.argv.slice(2).length ? process.argv.slice(2) : RUTAS;
let navegador;
try {
  navegador = await chromium.launch();
} catch (error) {
  console.error("No se pudo abrir Chromium. Instálalo con: npx playwright install chromium\n");
  console.error(error.message);
  process.exit(2);
}

let total = 0;
for (const ancho of ANCHOS) {
  const contexto = await navegador.newContext({
    viewport: { width: ancho, height: 800 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const pagina = await contexto.newPage();
  for (const ruta of rutas) {
    const respuesta = await pagina.goto(BASE + ruta, { waitUntil: "load" }).catch((e) => e);
    if (respuesta instanceof Error) {
      console.error(`✗ ${ruta}: no cargó (${respuesta.message.split("\n")[0]}). ¿Está corriendo el sitio en ${BASE}?`);
      process.exit(2);
    }
    // Mapas y otros servicios externos pueden no terminar nunca: se espera un poco, sin exigirlo.
    await pagina.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => {});
    await pagina.evaluate(() => document.fonts.ready);
    // Sin estilos todo cabe (el texto fluye solo): eso no es un resultado válido.
    const conEstilos = await pagina.evaluate(() => getComputedStyle(document.body).display === "flex");
    if (!conEstilos) {
      console.error(`✗ ${ruta}: la página cargó sin estilos (¿build viejo o CSS que no llega?). No se puede revisar.`);
      process.exit(2);
    }
    const revisiones = [{ nombre: ruta, problemas: await pagina.evaluate(buscarDesbordes) }];

    // El menú del celular (hoja que sube desde abajo), en la primera página.
    const menu = pagina.locator("[data-barra-pestanas] button", { hasText: "Menú" });
    if (ruta === rutas[0] && (await menu.count())) {
      // Sin coordenadas: si la página se desborda, el celular la aleja y el toque puede fallar.
      await menu.evaluate((boton) => boton.click());
      await pagina.waitForTimeout(400);
      revisiones.push({ nombre: `${ruta} (menú abierto)`, problemas: await pagina.evaluate(buscarDesbordes) });
      await pagina.keyboard.press("Escape");
    }

    for (const { nombre, problemas } of revisiones) {
      if (!problemas.length) continue;
      total += problemas.length;
      console.log(`\n✗ ${nombre} a ${ancho}px`);
      for (const p of problemas) console.log(`   ${p.elemento}\n     ${p.motivo}`);
    }
  }
  await contexto.close();
}
await navegador.close();

if (total) {
  console.log(`\n${total} desborde(s) en total.`);
  process.exit(1);
}
console.log(`✓ Sin desbordes: ${rutas.length} páginas × ${ANCHOS.length} anchos (${ANCHOS.join(", ")} px).`);
