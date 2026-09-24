import type { Metadata } from "next";
import Link from "next/link";

import { PaginaLegal } from "@/components/legal/pagina-legal";
import { ACTUALIZACION_LEGALES, CORREO_CONTACTO, MAX_NEGOCIOS_POR_CUENTA } from "@/lib/constantes";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description: "Condiciones de uso de EmprendeHN, el directorio de emprendedores y negocios de Honduras.",
  alternates: { canonical: "/terminos" },
};

export default function PaginaTerminos() {
  const correo = <a href={`mailto:${CORREO_CONTACTO}`}>{CORREO_CONTACTO}</a>;

  return (
    <PaginaLegal titulo="Términos y condiciones" ruta="/terminos" actualizado={ACTUALIZACION_LEGALES}>
      <p>
        Estos términos regulan el uso de EmprendeHN (emprendehn.com). Al usar el sitio o crear una
        cuenta, aceptas estas condiciones y nuestra{" "}
        <Link href="/privacidad">Política de privacidad</Link>. Si no estás de acuerdo, por favor no
        uses el servicio.
      </p>

      <h2>1. El servicio</h2>
      <p>
        EmprendeHN es un directorio en línea donde emprendedores y negocios de Honduras pueden publicar
        un perfil con sus datos de contacto, y donde cualquier persona puede buscarlos y, con una
        cuenta, dejarles reseñas. Actualmente el
        servicio es gratuito. Si en el futuro ofrecemos planes de pago, sus condiciones se informarán
        con claridad antes de que decidas contratarlos.
      </p>

      <h2>2. Tu cuenta</h2>
      <ul>
        <li>Debes ser mayor de 18 años o contar con la autorización de tu madre, padre o tutor.</li>
        <li>La información de tu cuenta debe ser real y estar al día.</li>
        <li>Eres responsable de mantener tu contraseña en secreto y de lo que se haga con tu cuenta.</li>
        <li>Cada cuenta puede registrar hasta {MAX_NEGOCIOS_POR_CUENTA} negocios.</li>
      </ul>

      <h2>3. El contenido que publicas</h2>
      <p>Al publicar un negocio, confirmas que:</p>
      <ul>
        <li>El negocio existe, es legal y tienes derecho a representarlo.</li>
        <li>La información es verdadera y la mantendrás actualizada.</li>
        <li>
          Las fotos, logos y textos son tuyos o tienes permiso para usarlos, y no infringen derechos de
          otras personas.
        </li>
      </ul>
      <p>
        Sigues siendo dueño de tu contenido. Nos das permiso, sin costo y mientras tu negocio esté
        publicado, para mostrarlo, adaptarlo (por ejemplo, cambiar el tamaño de las fotos) y difundirlo
        dentro de EmprendeHN y al promocionar el directorio.
      </p>

      <h2>4. Qué no está permitido</h2>
      <ul>
        <li>Publicar productos o servicios ilegales, o negocios que no existen.</li>
        <li>Suplantar a otra persona o a otro negocio.</li>
        <li>Publicar datos falsos o engañosos, spam o enlaces maliciosos.</li>
        <li>Publicar contenido sexual, violento, discriminatorio u ofensivo.</li>
        <li>Usar contenido protegido por derechos de autor o marcas sin autorización.</li>
        <li>Intentar dañar el sitio, acceder a cuentas ajenas o extraer datos de forma automatizada.</li>
      </ul>

      <h2>5. Revisión de negocios</h2>
      <p>
        Revisamos cada negocio antes de publicarlo y podemos aprobarlo, pedir cambios (rechazarlo) o
        suspenderlo si no cumple estos términos. Te avisaremos por correo e indicaremos el motivo en tu
        panel. Los cambios que hagas a un negocio ya publicado se muestran de inmediato, pero podemos
        revisarlos después. Cualquier persona puede reportar un negocio, y revisaremos esos reportes.
      </p>

      <h2>6. Reseñas</h2>
      <ul>
        <li>Solo puedes dejar una reseña por negocio y debe contar una experiencia real con él.</li>
        <li>No puedes reseñar tu propio negocio ni pedir o pagar reseñas falsas.</li>
        <li>
          No se permiten insultos, datos personales de terceros, spam ni contenido que no hable del
          negocio.
        </li>
        <li>
          El dueño del negocio puede responder públicamente y reportarnos una reseña. Podemos ocultar
          las que incumplan estas reglas; las críticas honestas se quedan.
        </li>
      </ul>

      <h2>7. Relación entre clientes y negocios</h2>
      <p>
        EmprendeHN solo facilita que clientes y negocios se encuentren. No vendemos los productos ni
        prestamos los servicios que se publican, y no participamos en los acuerdos, pagos o entregas
        entre ellos. Cada negocio es responsable de lo que ofrece. Aunque revisamos los perfiles, no
        podemos garantizar que toda la información sea exacta en todo momento.
      </p>

      <h2>8. Responsabilidad</h2>
      <p>
        Ofrecemos el servicio &ldquo;tal cual&rdquo;. Hacemos lo posible para que funcione bien y sin
        interrupciones, pero no podemos garantizarlo. En la medida en que la ley lo permita, EmprendeHN no
        será responsable por daños derivados del uso del directorio ni de los tratos entre clientes y
        negocios.
      </p>

      <h2>9. Suspensión y cancelación</h2>
      <p>
        Puedes eliminar tus negocios o tu cuenta cuando quieras desde tu panel. Podemos suspender o
        eliminar negocios o cuentas que incumplan estos términos.
      </p>

      <h2>10. Cambios a estos términos</h2>
      <p>
        Podemos actualizar estos términos. Publicaremos la nueva versión con su fecha y, si el cambio es
        importante, te avisaremos. Si sigues usando el servicio, se entiende que aceptas la nueva
        versión.
      </p>

      <h2>11. Ley aplicable y contacto</h2>
      <p>
        Estos términos se rigen por las leyes de la República de Honduras. Para cualquier consulta,
        escríbenos a {correo}.
      </p>
    </PaginaLegal>
  );
}
