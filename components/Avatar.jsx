import Image from 'next/image';

// Google photo when there is one; otherwise the first letter of the name.
const Avatar = ({ image, name, size = 40 }) => {
  if (image) {
    return (
      <Image
        src={image}
        alt=""
        width={size}
        height={size}
        className="rounded-full border-2 border-ink object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className="flex items-center justify-center rounded-full border-2 border-ink bg-sky font-display font-semibold text-ink"
    >
      {(name || '?').charAt(0).toUpperCase()}
    </span>
  );
};

export default Avatar;
