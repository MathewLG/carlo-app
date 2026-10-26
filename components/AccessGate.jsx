'use client';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';

const JOIN_PATH = '/unirse';
const WELCOME_PATH = '/bienvenida';
// Pages for writing and changing things; Carlo's account only reads.
const WRITE_PAGES = [/^\/create-memory$/, /^\/memories\/[^/]+\/edit$/, /^\/profile$/, /^\/admin(\/|$)/];
const RESUMED = 'carlo-app:resumed';

// Where a signed-in person should be instead of `pathname`, or null.
// Exported for tests.
export const redirectFor = (user, pathname, { resumed = true } = {}) => {
  if (!user) return null;
  if (user.role === 'carlo') {
    if (user.carloWaiting) return null; // shown the waiting page instead
    if (!user.welcomed) return pathname === WELCOME_PATH ? null : WELCOME_PATH;
    if (WRITE_PAGES.some((page) => page.test(pathname)) || pathname === JOIN_PATH) return '/linea-del-tiempo';
    // Each visit starts on the timeline, where he left off.
    if (pathname === '/' && !resumed) return '/linea-del-tiempo';
    return null;
  }
  const pending = !user.allowed;
  if (pending && pathname !== JOIN_PATH) return JOIN_PATH;
  if (!pending && pathname === JOIN_PATH) return '/';
  return null;
};

const readResumed = () => {
  try {
    return sessionStorage.getItem(RESUMED) === '1';
  } catch {
    return true;
  }
};

// Sends signed-in accounts that are not on the allow list to /unirse, and
// members away from it; shows Carlo his welcome first and keeps him off the
// pages for writing. This only shapes the pages: the API refuses on its own.
const AccessGate = ({ children }) => {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const user = status === 'authenticated' ? session?.user : null;
  const redirectTo = redirectFor(user, pathname, { resumed: user?.role === 'carlo' ? readResumed() : true });

  useEffect(() => {
    if (user?.role === 'carlo' && pathname === '/linea-del-tiempo') {
      try {
        sessionStorage.setItem(RESUMED, '1');
      } catch {
        // Without storage he simply starts on the timeline each time.
      }
    }
    if (redirectTo) router.replace(redirectTo);
  }, [redirectTo, router, user?.role, pathname]);

  if (user?.carloWaiting) {
    return (
      <section className="mx-auto mt-16 flex max-w-xl flex-col items-center gap-5 text-center">
        <h1 className="text-4xl font-bold">Hola, Carlo</h1>
        <p className="text-lg text-ink-soft">
          Todavía no es tiempo. Tu familia te está guardando muchos recuerdos aquí, y se abrirán para ti cuando llegue el día.
        </p>
        <button type="button" className="btn btn-outline" onClick={() => signOut()}>Cerrar sesión</button>
      </section>
    );
  }
  if (redirectTo) return null;
  return children;
};

export default AccessGate;
