import Link from 'next/link';

export const metadata = { title: 'Privacidad' };

const Section = ({ title, children }) => (
  <section className="mt-8">
    <h2 className="text-2xl font-bold">{title}</h2>
    <div className="mt-3 flex flex-col gap-3 text-lg leading-relaxed">{children}</div>
  </section>
);

// What Carlo App keeps, where, and who can see it. Keep this page true when
// the app changes what it stores or where.
const Privacy = () => (
  <article className="mx-auto mt-6 w-full max-w-2xl">
    <h1 className="text-4xl font-bold sm:text-5xl">Privacidad</h1>
    <p className="mt-4 text-lg text-ink-soft">
      Carlo App es una aplicación privada de una familia. No tiene anuncios, no vende ni comparte datos, y no usa
      cookies para seguirte: solo la de tu sesión.
    </p>

    <Section title="Qué guardamos">
      <p>
        De tu cuenta de Google: tu correo, tu nombre y tu foto de perfil. También el nombre que elijas mostrar en la
        aplicación.
      </p>
      <p>
        Lo que escribes para Carlo: recuerdos, fotos, notas de voz, palabras del Diccionario y cartas con candado,
        con las fechas que les pongas.
      </p>
    </Section>

    <Section title="Dónde se guarda">
      <p>
        Los textos están en una base de datos de MongoDB Atlas. Las fotos y notas de voz están en un almacenamiento
        privado de Vercel: no se pueden abrir con un enlace, solo desde la aplicación y con sesión iniciada. El sitio
        funciona en Vercel.
      </p>
    </Section>

    <Section title="Quién lo puede ver">
      <p>
        Solo la familia que está en la lista de Carlo App. Para entrar hay que iniciar sesión con Google y estar en
        la lista o tener el código familiar.
      </p>
      <p>
        Una carta con candado solo la puede leer quien la escribió hasta su fecha. El administrador no puede
        abrirla en la aplicación, pero sí se guarda en el respaldo de la familia, aparte y con su fecha.
      </p>
      <p>Carlo podrá leerlo todo, sin cambiar nada, cuando se abra su acceso.</p>
    </Section>

    <Section title="Servicios que usamos">
      <p>
        Los correos de la aplicación (cuando se abre una carta y el recordatorio mensual) solo le llegan al
        administrador y se envían con Resend.
      </p>
      <p>
        Los nombres de los momentos de la línea del tiempo los escribe el administrador con ayuda de Claude, de
        Anthropic. Para eso solo se usan la fecha, la edad de Carlo, la categoría y el principio de cada recuerdo:
        nunca nombres, fotos, notas de voz ni cartas con candado.
      </p>
    </Section>

    <Section title="Borrar tus datos">
      <p>
        Puedes borrar tus recuerdos y palabras cuando quieras. Si quieres que se borre tu cuenta, pídeselo a Mathew,
        el administrador.
      </p>
    </Section>

    <p className="mt-10">
      <Link href="/" className="link">Volver a los recuerdos</Link>
    </p>
  </article>
);

export default Privacy;
