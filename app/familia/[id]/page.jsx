'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Avatar from '@components/Avatar';
import Feed from '@components/Feed';
import useFamilyData from '@components/useFamilyData';

// Everything one person wrote, in the order it happened.
export default function FamilyMember() {
  const { id } = useParams();
  const { session, status, data: person } = useFamilyData(`/api/family/${id}`);

  if (session === 'unauthenticated') return <p className="status-text mt-12">Inicia sesión para ver a la familia.</p>;
  if (status === 'loading') return <p role="status" className="status-text mt-12">Cargando…</p>;
  if (status === 'missing') {
    return (
      <div className="mt-12 flex flex-col items-center gap-4">
        <p className="status-text">No encontramos a esta persona.</p>
        <Link href="/familia" className="btn btn-outline">Ver a toda la familia</Link>
      </div>
    );
  }
  if (status === 'error') return <p role="alert" className="status-text mt-12">No se pudo cargar esta página. Recarga la página.</p>;

  return (
    <section className="mt-6">
      <Link href="/familia" className="link text-sm">← Toda la familia</Link>
      <div className="mt-4 flex items-center gap-4">
        <Avatar image={person.image} name={person.name} size={64} />
        <div>
          <h1 className="text-4xl font-bold sm:text-5xl">{person.name}</h1>
          <p className="mt-1 text-lg text-ink-soft">
            {person.count === 1 ? '1 recuerdo para Carlo' : `${person.count} recuerdos para Carlo`}, del primero al más reciente.
          </p>
        </div>
      </div>
      <Feed author={person.id} />
    </section>
  );
}
