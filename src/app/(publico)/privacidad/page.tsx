import type { Metadata } from "next";
import Link from "next/link";

import { PaginaLegal } from "@/components/legal/pagina-legal";
import { ACTUALIZACION_LEGALES, CORREO_CONTACTO } from "@/lib/constantes";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Qué datos recopila EmprendeHN, para qué los usa, con quién los comparte y cómo puedes ejercer tus derechos.",
  alternates: { canonical: "/privacidad" },
};

export default function PaginaPrivacidad() {
  const correo = <a href={`mailto:${CORREO_CONTACTO}`}>{CORREO_CONTACTO}</a>;

  return (
    <PaginaLegal titulo="Política de privacidad" ruta="/privacidad" actualizado={ACTUALIZACION_LEGALES}>
      <p>
        En EmprendeHN (emprendehn.com), el directorio de emprendedores y negocios de Honduras, cuidamos
        los datos de las personas que nos visitan y de quienes publican su negocio. Esta política explica
        qué datos recopilamos, para qué y qué puedes hacer con ellos. Si tienes dudas, escríbenos a{" "}
        {correo}.
      </p>

      <h2>1. Qué datos recopilamos</h2>
      <p>
        <strong>Si creas una cuenta:</strong> tu nombre, tu correo electrónico y tu contraseña. La
        contraseña se guarda cifrada: nadie, ni siquiera nosotros, puede leerla.
        {process.env.NEXT_PUBLIC_LOGIN_GOOGLE === "true" &&
          " Si entras con Google, recibimos de tu cuenta de Google solo tu nombre, tu correo y tu foto de perfil; no vemos tu contraseña de Google."}
      </p>
      <p>
        <strong>Si registras un negocio:</strong> los datos que escribes en su perfil (nombre,
        descripción, categoría, ciudad, localidad, dirección, teléfono, WhatsApp, correo de contacto,
        redes sociales y horario), además del logo y las fotos que subes.{" "}
        <strong>Estos datos son públicos</strong> una vez que aprobamos el negocio: cualquier persona
        puede verlos en el directorio y en buscadores como Google.
      </p>
      <p>
        <strong>Si dejas una reseña:</strong> tu calificación y tu comentario se publican junto con tu
        primer nombre y la inicial de tu apellido (por ejemplo, &ldquo;María L.&rdquo;). Nunca mostramos tu
        correo. El dueño del negocio puede responderla.
      </p>
      <p>
        <strong>Si reportas un negocio:</strong> el motivo, tu comentario y, solo si lo escribes, un
        correo para contactarte.
      </p>
      <p>
        <strong>Datos técnicos:</strong> como cualquier sitio web, nuestros proveedores registran datos
        como la dirección IP, el tipo de navegador y la fecha de cada visita, para operar el servicio y
        protegerlo de abusos.
      </p>
      <p>
        <strong>Estadísticas para los negocios:</strong> contamos cuántas veces se visita la página de
        cada negocio y cuántas veces se tocan sus botones de WhatsApp, llamada, mapa y redes. Solo
        guardamos esos totales por día; no guardamos quién visitó ni datos que te identifiquen.
      </p>

      <h2>2. Para qué los usamos</h2>
      <ul>
        <li>Crear y mantener tu cuenta, y permitirte iniciar sesión.</li>
        <li>Publicar el perfil de tu negocio en el directorio después de revisarlo.</li>
        <li>
          Enviarte correos necesarios del servicio: confirmación de cuenta, recuperación de contraseña
          y avisos sobre la revisión de tu negocio (aprobado, rechazado o suspendido).
        </li>
        <li>Revisar los negocios y los reportes para mantener un directorio confiable.</li>
        <li>Prevenir el spam, el fraude y otros abusos.</li>
      </ul>
      <p>
        No vendemos tus datos ni te enviamos publicidad por correo. No usamos cookies de publicidad ni
        de seguimiento.
      </p>

      <h2>3. Con quién los compartimos</h2>
      <p>
        Solo con los proveedores que necesitamos para que el sitio funcione, y únicamente para ese fin:
      </p>
      <ul>
        <li><strong>Supabase:</strong> base de datos, cuentas de usuario y almacenamiento de fotos.</li>
        <li><strong>Vercel:</strong> alojamiento del sitio web.</li>
        <li><strong>Resend:</strong> envío de los correos del servicio.</li>
        {process.env.NEXT_PUBLIC_LOGIN_GOOGLE === "true" && (
          <li>
            <strong>Google:</strong> inicio de sesión con tu cuenta de Google, solo si eliges esa opción.
          </li>
        )}
        {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
          <li>
            <strong>Cloudflare Turnstile:</strong> verificación contra bots en los formularios de
            registro e inicio de sesión.
          </li>
        )}
      </ul>
      <p>
        Estos proveedores pueden guardar la información en servidores fuera de Honduras (por ejemplo,
        en Estados Unidos). Los enlaces a Google Maps y WhatsApp de cada negocio abren esos servicios, que
        tienen sus propias políticas de privacidad. También podríamos entregar datos si una autoridad
        competente lo exige conforme a la ley.
      </p>

      <h2>4. Cookies</h2>
      <p>
        Usamos únicamente las cookies necesarias para mantener tu sesión iniciada. Sin ellas no podrías
        entrar a tu panel. No usamos cookies de publicidad ni de análisis de terceros. Para no contar dos
        veces tu visita a un negocio, tu navegador guarda una marca temporal (sessionStorage) que se borra
        al cerrar la pestaña.
      </p>

      <h2>5. Tus derechos</h2>
      <p>Puedes, en cualquier momento:</p>
      <ul>
        <li><strong>Ver y corregir</strong> los datos de tu negocio desde tu panel.</li>
        <li><strong>Eliminar un negocio</strong> desde su página de edición.</li>
        <li>
          <strong>Eliminar tu cuenta</strong> desde <Link href="/panel/cuenta">Mi cuenta</Link>: se borran
          tu cuenta, tus negocios, sus fotos y tus reseñas. También puedes borrar una reseña desde la
          página del negocio.
        </li>
        <li>
          <strong>Pedirnos una copia</strong> de tus datos o cualquier otra consulta sobre ellos,
          escribiendo a {correo}.
        </li>
      </ul>

      <h2>6. Cuánto tiempo los guardamos</h2>
      <p>
        Mientras tu cuenta exista. Si la eliminas, borramos tu cuenta, tus negocios y sus fotos. Los
        registros técnicos y las copias de seguridad de nuestros proveedores pueden conservar
        información por un tiempo limitado antes de borrarse por completo. Los reportes se guardan
        mientras sean útiles para la revisión del directorio.
      </p>

      <h2>7. Seguridad</h2>
      <p>
        Usamos conexiones cifradas (HTTPS), contraseñas cifradas y permisos en la base de datos para que
        cada persona solo pueda modificar sus propios negocios. Ningún sistema es 100 % seguro: si
        detectas un problema, avísanos a {correo}.
      </p>

      <h2>8. Menores de edad</h2>
      <p>
        Para crear una cuenta y publicar un negocio debes ser mayor de 18 años o contar con la
        autorización de tu madre, padre o tutor.
      </p>

      <h2>9. Cambios a esta política</h2>
      <p>
        Si cambiamos esta política, actualizaremos la fecha de arriba. Si el cambio es importante, te
        avisaremos por correo o con un aviso en el sitio.
      </p>

      <h2>10. Contacto</h2>
      <p>
        Para cualquier consulta sobre tus datos, escríbenos a {correo} o visita la página de{" "}
        <Link href="/contacto">contacto</Link>.
      </p>
    </PaginaLegal>
  );
}
