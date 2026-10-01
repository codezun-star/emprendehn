// Corre en el navegador antes que el resto de la app.
//
// Zod 4 prueba si puede usar `new Function` para validar más rápido. La
// Content-Security-Policy (next.config.ts) no permite eval: la prueba falla sin
// consecuencias, pero el navegador la reporta como violación. Se desactiva.
import { config } from "zod/v4/core";

import { escucharInstalacion } from "@/lib/instalar-app";

config({ jitless: true });

// "Instalar la app" (menú del celular): el aviso del navegador puede llegar
// antes de que React termine de cargar.
escucharInstalacion();
