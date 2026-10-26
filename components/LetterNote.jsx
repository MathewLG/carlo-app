import { formatDate } from '@utils/format';
import { unlockText } from '@utils/letters';

// A line on a carta con candado that can be read: for its author before it
// opens ("only you can read it until…"), and for everyone after ("opened on…").
export const LetterNote = ({ memory, className = '' }) => {
  if (!memory.unlockAt) return null;
  return (
    <p className={`rounded-xl border-2 border-dashed border-ink/40 px-3 py-2 text-sm font-semibold ${className}`}>
      {memory.locked
        ? `🔒 Carta con candado: solo tú puedes leerla. ${unlockText(memory)}.`
        : `Carta con candado · Abierta el ${formatDate(new Date(memory.unlockAt))}`}
    </p>
  );
};
