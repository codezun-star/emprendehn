import { Alerta } from "@/components/ui/alerta";
import { describirCambios } from "@/lib/constantes";

/**
 * En las pestañas de edición de un negocio publicado. Los cambios se publican
 * al instante y el equipo los revisa después (migración 010); mientras tanto
 * el dueño ve qué está en revisión.
 */
export function AvisoPublicado({ cambios }: { cambios: string[] }) {
  if (cambios.length > 0) {
    return (
      <Alerta tono="aviso" titulo="Cambios en revisión">
        <p>
          Tu negocio sigue publicado y ya muestra los cambios. El equipo de EmprendeHN está revisando:{" "}
          <strong>{describirCambios(cambios)}</strong>.
        </p>
        <p className="mt-1">Si algo no cumple las reglas del directorio, te escribiremos por correo.</p>
      </Alerta>
    );
  }
  return (
    <Alerta tono="info">
      Tu negocio está publicado: lo que guardes se verá al instante. Si cambias el nombre, la
      descripción, la categoría, la ciudad, la ubicación en el mapa, el logo o las redes, o agregas
      fotos, el equipo de EmprendeHN lo revisará después.
    </Alerta>
  );
}
