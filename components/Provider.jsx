'use client';
import { SessionProvider } from 'next-auth/react';
import AccessGate from './AccessGate';

const Provider = ({ children, session }) => (
  <SessionProvider session={session}>
    <AccessGate>{children}</AccessGate>
  </SessionProvider>
);

export default Provider;
