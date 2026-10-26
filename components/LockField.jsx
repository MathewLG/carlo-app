'use client';
import useCarloBirthDate from './useCarloBirthDate';
import { parseDay, todayString, toDayString } from '@utils/dates';
import { formatDate } from '@utils/format';
import { dateAtAge, MAX_LOCK_AGE } from '@utils/letters';

// The form's lock state: { mode: 'none' | 'date' | 'age', until: 'YYYY-MM-DD', age: '15' }.
export const emptyLock = () => ({ mode: 'none', until: '', age: '' });

// The lock from a memory being edited, or undefined for a letter that already
// opened: its lock stays as it is and the field is not shown.
export const lockFromMemory = (memory) => {
  if (memory.unlockAt && !memory.locked) return undefined;
  if (!memory.unlockAt) return emptyLock();
  if (memory.lockAge) return { mode: 'age', until: '', age: String(memory.lockAge) };
  return { mode: 'date', until: toDayString(new Date(memory.unlockAt)), age: '' };
};

// The request body for a memory form: `lock` is left out when the field is not shown.
export const memoryBody = ({ lock, ...post }) => {
  if (lock === undefined) return post;
  if (lock.mode === 'date') return { ...post, lock: { until: lock.until } };
  if (lock.mode === 'age') return { ...post, lock: { age: Number(lock.age) } };
  return { ...post, lock: null };
};

const tomorrow = () => todayString(new Date(Date.now() + 24 * 60 * 60 * 1000));

// "Cerrar con candado": seal the letter until a day, or until Carlo turns an age.
const LockField = ({ value, onChange }) => {
  const birthDate = useCarloBirthDate();
  if (!value) return null;
  const set = (changes) => onChange({ ...value, ...changes });
  const age = Number(value.age);
  const ageDay = birthDate && Number.isInteger(age) && age >= 1 ? dateAtAge(parseDay(birthDate), age) : null;

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="label">¿Cerrar con candado?</legend>
      <p className="-mt-2 text-ink-soft">
        Una carta con candado se abre sola en su fecha. Antes, nadie más puede leerla, ni siquiera el administrador; tú sí.
      </p>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {[
          ['none', 'No'],
          ['date', 'Hasta una fecha'],
          ['age', 'Hasta que Carlo cumpla una edad'],
        ].map(([mode, label]) => (
          <label key={mode} className="flex items-center gap-2">
            <input type="radio" name="lock-mode" checked={value.mode === mode} onChange={() => set({ mode })} className="h-5 w-5" />
            {label}
          </label>
        ))}
      </div>
      {value.mode === 'date' && (
        <label>
          <span className="label">Se abre el</span>
          <input type="date" value={value.until} min={tomorrow()} onChange={(e) => set({ until: e.target.value })} required className="field" />
        </label>
      )}
      {value.mode === 'age' && (
        <label>
          <span className="label">Se abre cuando Carlo cumpla</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_LOCK_AGE}
            value={value.age}
            onChange={(e) => set({ age: e.target.value })}
            required
            aria-describedby="lock-age-day"
            className="field max-w-[8rem]"
          />
          <span id="lock-age-day" className="mt-1 block text-sm text-ink-soft">
            {!birthDate && 'Primero hay que guardar la fecha de nacimiento de Carlo (Admin → Carlo).'}
            {ageDay && `Se abrirá el ${formatDate(ageDay)}.`}
          </span>
        </label>
      )}
    </fieldset>
  );
};

export default LockField;
