import "server-only";

import { obtenerCategorias, obtenerDepartamentos, obtenerMunicipios } from "@/lib/consultas/directorio";

/** Opciones de los selects del formulario de negocio (datos pequeños y cacheables). */
export async function obtenerOpcionesFormulario() {
  const [{ arbol }, departamentos, { todos }] = await Promise.all([
    obtenerCategorias(),
    obtenerDepartamentos(),
    obtenerMunicipios(),
  ]);
  return {
    categorias: arbol.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      hijas: c.hijas.map((h) => ({ id: h.id, nombre: h.nombre })),
    })),
    departamentos,
    municipios: todos.map((m) => ({ id: m.id, nombre: m.nombre, departamento_id: m.departamento_id })),
    municipiosPorId: new Map(todos.map((m) => [m.id, m])),
  };
}
