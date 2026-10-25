'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

// One request per page load, shared by every component that asks.
let request = null;

export const forgetCarloBirthDate = () => {
  request = null;
};

// Carlo's birth date as 'YYYY-MM-DD', or null while loading, when it is not
// set yet, or for anyone who is not in the family.
export default function useCarloBirthDate() {
  const { data: session, status } = useSession();
  const allowed = status === 'authenticated' && session?.user?.allowed;
  const [birthDate, setBirthDate] = useState(null);

  useEffect(() => {
    if (!allowed) return;
    request ??= fetch('/api/settings')
      .then((response) => (response.ok ? response.json() : {}))
      .then((data) => data.carloBirthDate ?? null)
      .catch(() => null);
    let active = true;
    request.then((value) => active && setBirthDate(value));
    return () => {
      active = false;
    };
  }, [allowed]);

  return allowed ? birthDate : null;
}
