import { Alerta } from "@/components/ui/alerta";

/** En las pestañas de edición de un negocio publicado: los cambios se ven al instante (migración 010). */
export function AvisoPublicado() {
  return (
    <Alerta tono="info">
      Tu negocio está publicado: lo que guardes se verá al instante. Si cambias el nombre, la
      descripción, la categoría, la ciudad, el logo o las redes, o agregas fotos, el equipo de
      EmprendeHN lo revisará después.
    </Alerta>
  );
}
