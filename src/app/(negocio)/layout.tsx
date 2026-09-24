// Las páginas de cada negocio se ven como un sitio propio: sin el encabezado
// ni el pie del directorio (PaginaNegocio trae su barra y una firma discreta).
export default function LayoutNegocio({ children }: LayoutProps<"/">) {
  return children;
}
