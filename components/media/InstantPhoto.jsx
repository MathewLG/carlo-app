'use client';
import { useRef } from 'react';

// A memory's photo as an instant-camera print. Tapping it opens the whole
// photo; Escape, the close button or a tap outside closes it.
const InstantPhoto = ({ photo, className = '' }) => {
  const dialog = useRef(null);
  const alt = photo.caption ? `Foto: ${photo.caption}` : 'Foto del recuerdo';

  return (
    <>
      <figure className={`instant-photo ${className}`}>
        <button type="button" className="block w-full" onClick={() => dialog.current?.showModal()} aria-label="Ver la foto completa">
          {/* Plain img: the image optimizer cannot send the family's sign-in. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.url} alt={alt} width={photo.width} height={photo.height} loading="lazy" />
        </button>
        <figcaption>{photo.caption}</figcaption>
      </figure>

      <dialog
        ref={dialog}
        aria-label={alt}
        className="m-auto max-h-[92vh] max-w-[92vw] rounded-xl border-2 border-ink bg-white p-3 backdrop:bg-ink/70"
        onClick={(e) => e.target === dialog.current && dialog.current.close()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.url} alt={alt} className="max-h-[80vh] w-auto object-contain" />
        <div className="mt-2 flex items-center justify-between gap-4">
          <p className="font-hand text-2xl text-ink">{photo.caption}</p>
          <button type="button" className="btn btn-outline" onClick={() => dialog.current?.close()}>
            Cerrar
          </button>
        </div>
      </dialog>
    </>
  );
};

export default InstantPhoto;
