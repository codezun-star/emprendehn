"use client";

import { CircleUserRound, House, LayoutGrid, Menu, Search } from "lucide-react";
import { useState } from "react";

import { BarraPestanas, BotonPestana } from "./barra-pestanas";
import { useHaySesion } from "./enlace-sesion";
import { MenuSitio } from "./menu-sitio";

const RUTAS_CUENTA = ["/ingresar", "/registro", "/recuperar-contrasena", "/nueva-contrasena", "/dos-pasos"];

/** Pestañas del directorio en el celular: Inicio, Categorías, Buscar, la cuenta y el menú. */
export function PestanasSitio() {
  const conSesion = useHaySesion();
  const [menu, setMenu] = useState(false);

  return (
    <>
      <BarraPestanas
        etiqueta="Navegación"
        pestanas={[
          { href: "/", etiqueta: "Inicio", icono: House, activa: (r) => r === "/" },
          {
            href: "/categorias",
            etiqueta: "Categorías",
            icono: LayoutGrid,
            activa: (r) => r === "/categorias" || r.startsWith("/categoria/"),
          },
          { href: "/buscar", etiqueta: "Buscar", icono: Search, activa: (r) => r === "/buscar" },
          conSesion
            ? { href: "/panel", etiqueta: "Mi panel", icono: CircleUserRound, activa: () => false }
            : { href: "/ingresar", etiqueta: "Ingresar", icono: CircleUserRound, activa: (r) => RUTAS_CUENTA.includes(r) },
        ]}
      >
        <BotonPestana
          etiqueta="Menú"
          icono={Menu}
          activa={menu}
          aria-haspopup="dialog"
          aria-expanded={menu}
          onClick={() => setMenu(true)}
        />
      </BarraPestanas>
      <MenuSitio abierto={menu} alCerrar={() => setMenu(false)} conSesion={conSesion} />
    </>
  );
}
