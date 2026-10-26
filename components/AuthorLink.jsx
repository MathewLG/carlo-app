import Link from 'next/link';

// Wraps an author's name or photo in a link to their family page. A memory
// whose author's account is gone has no page, so it stays plain text.
const AuthorLink = ({ person, children, ...props }) =>
  person?._id ? (
    <Link href={`/familia/${person._id}`} {...props}>
      {children}
    </Link>
  ) : (
    <span className={props.className}>{children}</span>
  );

export default AuthorLink;
