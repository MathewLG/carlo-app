'use client';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

const JOIN_PATH = '/unirse';

// Sends signed-in accounts that are not on the allow list to /unirse, and
// members away from it. This only shapes the pages: the API refuses
// non-members on its own.
const AccessGate = ({ children }) => {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const pending = status === 'authenticated' && !session?.user?.allowed;
  const onJoinPage = pathname === JOIN_PATH;
  const redirectTo = pending && !onJoinPage ? JOIN_PATH : !pending && onJoinPage && status === 'authenticated' ? '/' : null;

  useEffect(() => {
    if (redirectTo) router.replace(redirectTo);
  }, [redirectTo, router]);

  if (redirectTo) return null;
  return children;
};

export default AccessGate;
