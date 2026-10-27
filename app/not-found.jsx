import Link from 'next/link';

export const metadata = { title: 'No encontramos esta página' };

const NotFound = () => (
  <section className="mx-auto mt-16 flex max-w-xl flex-col items-center gap-5 text-center">
    <h1 className="text-4xl font-bold">No encontramos esta página</h1>
    <p className="text-lg text-ink-soft">Puede que el enlace esté mal escrito o que la página ya no exista.</p>
    <Link href="/" className="btn btn-primary">Volver a los recuerdos</Link>
  </section>
);

export default NotFound;
