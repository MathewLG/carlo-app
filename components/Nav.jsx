'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { signIn, signOut, useSession } from 'next-auth/react';
import Avatar from './Avatar';

const Nav = () => {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  // The menu remembers the page it was opened on, so navigating closes it.
  const [menuOpenOn, setMenuOpenOn] = useState(null);
  const menuOpen = menuOpenOn === pathname;
  const menuRef = useRef(null);
  const user = session?.user;
  const isAdmin = user?.role === 'admin';

  // Close the mobile menu on Escape or a tap outside it.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => e.key === 'Escape' && setMenuOpenOn(null);
    const onClick = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenuOpenOn(null);
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, [menuOpen]);

  const signInButton = (
    <button type="button" onClick={() => signIn('google')} className="btn btn-primary">
      Iniciar sesión
    </button>
  );

  return (
    <nav className="flex items-center justify-between gap-4 py-5">
      <Link href="/" className="flex items-center gap-2" aria-label="Carlo App, inicio">
        <Image src="/assets/images/carlo-app.png" alt="" width={44} height={44} priority />
      </Link>

      {/* Desktop */}
      <div className="hidden items-center gap-4 sm:flex">
        {user ? (
          <>
            {isAdmin && (
              <Link href="/admin/familia" className="link" aria-current={pathname === '/admin/familia' ? 'page' : undefined}>
                Familia
              </Link>
            )}
            <Link href="/profile" className="link" aria-current={pathname === '/profile' ? 'page' : undefined}>
              Mis recuerdos
            </Link>
            <Link href="/create-memory" className="btn btn-sun">
              Escribir un recuerdo
            </Link>
            <button type="button" onClick={() => signOut()} className="btn btn-outline">
              Cerrar sesión
            </button>
            <Avatar image={user.image} name={user.username || user.name} />
          </>
        ) : (
          status === 'unauthenticated' && signInButton
        )}
      </div>

      {/* Mobile */}
      <div className="relative sm:hidden" ref={menuRef}>
        {user ? (
          <>
            <button
              type="button"
              aria-label="Menú"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMenuOpenOn(menuOpen ? null : pathname)}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full"
            >
              <Avatar image={user.image} name={user.username || user.name} />
            </button>
            {menuOpen && (
              <div
                id="mobile-menu"
                className="sticker absolute right-0 top-full z-20 mt-3 flex w-64 flex-col gap-3"
              >
                <Link href="/create-memory" className="btn btn-sun">
                  Escribir un recuerdo
                </Link>
                <Link href="/profile" className="btn btn-outline">
                  Mis recuerdos
                </Link>
                {isAdmin && (
                  <Link href="/admin/familia" className="btn btn-outline">
                    Familia
                  </Link>
                )}
                <button type="button" onClick={() => signOut()} className="btn btn-outline">
                  Cerrar sesión
                </button>
              </div>
            )}
          </>
        ) : (
          status === 'unauthenticated' && signInButton
        )}
      </div>
    </nav>
  );
};

export default Nav;
