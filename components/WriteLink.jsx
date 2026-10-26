'use client';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

// True for everyone who may write; Carlo's account only reads.
export const useCanWrite = () => useSession().data?.user?.role !== 'carlo';

// "Escribir un recuerdo", for everyone but Carlo.
const WriteLink = ({ className = 'btn btn-sun' }) =>
  useCanWrite() ? (
    <Link href="/create-memory" className={className}>
      Escribir un recuerdo
    </Link>
  ) : null;

export default WriteLink;
