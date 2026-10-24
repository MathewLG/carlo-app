'use client';
import { useSession } from 'next-auth/react';
import Avatar from '@components/Avatar';
import Feed from '@components/Feed';

export default function Profile() {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <section className="mt-6">
      {user && (
        <div className="flex items-center gap-4">
          <Avatar image={user.image} name={user.username || user.name} size={64} />
          <div>
            <h1 className="text-4xl font-bold sm:text-5xl">Mis recuerdos</h1>
            <p className="mt-1 text-lg text-ink-soft">Todo lo que has escrito para Carlo.</p>
          </div>
        </div>
      )}
      <Feed mine />
    </section>
  );
}
