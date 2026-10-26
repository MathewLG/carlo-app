export const formatDuration = (seconds) => {
  const total = Math.round(seconds || 0);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

// A memory's voice note with the browser's own player, which works with a
// keyboard and screen readers.
const VoiceNote = ({ voice }) => (
  <figure className="flex flex-col gap-2">
    <figcaption className="font-display text-sm font-semibold text-ink">
      Nota de voz{voice.durationSec ? ` · ${formatDuration(voice.durationSec)}` : ''}
    </figcaption>
    <audio controls preload="none" src={voice.url} className="w-full">
      <a href={voice.url}>Escuchar la nota de voz</a>
    </audio>
  </figure>
);

export default VoiceNote;
