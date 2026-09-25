// Corre en el navegador antes que el resto de la app.
//
// Zod 4 prueba si puede usar `new Function` para validar más rápido. La
// Content-Security-Policy (next.config.ts) no permite eval: la prueba falla sin
// consecuencias, pero el navegador la reporta como violación. Se desactiva.
import { config } from "zod/v4/core";

config({ jitless: true });
