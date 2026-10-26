'use client';
import Link from 'next/link';
import Avatar from '@components/Avatar';
import useFamilyData from '@components/useFamilyData';
import WriteLink from '@components/WriteLink';

const count = (n) => (n === 1 ? '1 recuerdo' : `${n} recuerdos`);

// Everyone who has written for Carlo; each opens their own page.
export default function Family() {
  const { session, status, data: people } = useFamilyData('/api/family');

  if (session === 'unauthenticated') return <p className="status-text mt-12">Inicia sesión para ver a la familia.</p>;

  return (
    <section className="mx-auto mt-6 w-full max-w-5xl">
      <h1 className="text-4xl font-bold sm:text-5xl">Familia</h1>
      <p className="mt-3 text-lg text-ink-soft">Quienes te han escrito, Carlo. Abre a cada uno para leer todo lo que te dejó.</p>

      {status === 'loading' && <p role="status" className="status-text mt-12">Cargando a la familia…</p>}
      {status === 'error' && <p role="alert" className="status-text mt-12">No se pudo cargar a la familia. Recarga la página.</p>}
      {status === 'ready' && people.length === 0 && (
        <div className="mt-12 flex flex-col items-center gap-4">
          <p className="status-text">Todavía nadie ha escrito un recuerdo.</p>
          <WriteLink />
        </div>
      )}
      {status === 'ready' && people.length > 0 && (
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {people.map((person) => (
            <li key={person.id}>
              <Link href={`/familia/${person.id}`} className="sticker flex items-center gap-4 hover:-translate-y-0.5">
                <Avatar image={person.image} name={person.name} size={56} />
                <span>
                  <span className="block font-display text-xl font-semibold leading-tight">{person.name}</span>
                  <span className="text-ink-soft">{count(person.count)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
