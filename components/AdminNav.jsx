'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const PAGES = [
  { href: '/admin/familia', label: 'Familia' },
  { href: '/admin/carlo', label: 'Carlo' },
  { href: '/admin/respaldo', label: 'Respaldo' },
];

// Tabs between the admin pages.
const AdminNav = () => {
  const pathname = usePathname();
  return (
    <nav aria-label="Administración" className="mt-4 flex gap-4">
      {PAGES.map((page) => (
        <Link
          key={page.href}
          href={page.href}
          className="link"
          aria-current={pathname === page.href ? 'page' : undefined}
        >
          {page.label}
        </Link>
      ))}
    </nav>
  );
};

export default AdminNav;
