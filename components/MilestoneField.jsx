'use client';
import { useState } from 'react';
import { MAX_MILESTONE_LENGTH, MILESTONES } from '@utils/milestones';

const OTHER = 'otra';

// "¿Es una primera vez?": one of the usual milestones, or the family's own words.
const MilestoneField = ({ value, onChange }) => {
  const isListed = MILESTONES.some((m) => m.label === value);
  const [other, setOther] = useState(Boolean(value) && !isListed);
  const choice = other ? OTHER : value || '';

  const pick = (e) => {
    const next = e.target.value;
    setOther(next === OTHER);
    onChange(next === OTHER ? '' : next);
  };

  return (
    <div className="flex flex-col gap-3">
      <label>
        <span className="label">¿Es una primera vez?</span>{' '}
        <span className="text-ink-soft">(aparece como su propio momento en la línea del tiempo)</span>
        <select value={choice} onChange={pick} className="field">
          <option value="">No</option>
          {MILESTONES.map((m) => (
            <option key={m.label} value={m.label}>
              {m.label}
            </option>
          ))}
          <option value={OTHER}>Otra primera vez…</option>
        </select>
      </label>
      {other && (
        <label>
          <span className="label">¿Cuál primera vez?</span>
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            maxLength={MAX_MILESTONE_LENGTH}
            placeholder="Por ejemplo: Primera vez en el mar"
            required
            className="field"
          />
        </label>
      )}
    </div>
  );
};

export default MilestoneField;
