'use client';
import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

// Loads JSON from the app's API once signed in. Returns { status, data,
// reload }, with status 'loading' | 'ready' | 'missing' (404) | 'error'.
const useFamilyData = (url) => {
  const { status: session } = useSession();
  const [reloadKey, setReloadKey] = useState(0);
  const key = `${url}|${reloadKey}`;
  const [result, setResult] = useState({ key: null, status: 'loading', data: null });
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (session !== 'authenticated') return;
    const controller = new AbortController();
    fetch(url, { signal: controller.signal })
      .then(async (response) => {
        if (response.status === 404) return setResult({ key, status: 'missing', data: null });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        setResult({ key, status: 'ready', data: await response.json() });
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        console.error(`Could not load ${url}`, error);
        setResult({ key, status: 'error', data: null });
      });
    return () => controller.abort();
  }, [session, url, key]);

  // Keeps showing the last data while a reload is on its way.
  const status = result.key === key ? result.status : result.data ? 'ready' : 'loading';
  return { session, status, data: result.data, reload };
};

export default useFamilyData;
