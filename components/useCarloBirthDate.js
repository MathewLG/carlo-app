'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

// One request per page load, shared by every component that asks.
let request = null;

export const forgetCarloBirthDate = () => {
  request = null;
};

// The app settings the family may read (GET /api/settings), or null while
// loading and for anyone who is not in the family.
export function useAppSettings() {
  const { data: session, status } = useSession();
  const allowed = status === 'authenticated' && session?.user?.allowed;
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    if (!allowed) return;
    request ??= fetch('/api/settings')
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null);
    let active = true;
    request.then((value) => active && setSettings(value));
    return () => {
      active = false;
    };
  }, [allowed]);

  return allowed ? settings : null;
}

// Carlo's birth date as 'YYYY-MM-DD', or null while loading, when it is not
// set yet, or for anyone who is not in the family.
export default function useCarloBirthDate() {
  return useAppSettings()?.carloBirthDate ?? null;
}
