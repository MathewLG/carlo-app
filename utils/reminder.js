import { ageAt } from '@utils/age';
import { dayParts, TIME_ZONE } from '@utils/dates';
import { MILESTONES } from '@utils/milestones';

// Mexico City has had no daylight saving time since 2022: always UTC-6.
const MEXICO_OFFSET_HOURS = 6;

const escapeHtml = (text) =>
  String(text ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// 'YYYY-MM' of the month `now` falls in, in Mexico City: one reminder each.
export const monthKey = (now = new Date()) => {
  const { year, month } = dayParts(now);
  return `${year}-${String(month).padStart(2, '0')}`;
};

// The calendar month before `now` in Mexico City, as [start, end).
export const previousMonth = (now = new Date()) => {
  const { year, month } = dayParts(now);
  return {
    start: new Date(Date.UTC(year, month - 2, 1, MEXICO_OFFSET_HOURS)),
    end: new Date(Date.UTC(year, month - 1, 1, MEXICO_OFFSET_HOURS)),
  };
};

const monthName = (date) => new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric', timeZone: TIME_ZONE }).format(date);

// The monthly email to the admin: what was written last month and by whom,
// Carlo's age now, and which Primeras veces have no memory yet. `authors` is
// one name per memory written last month; `recorded` the milestone labels
// that already have one. Returns { subject, html, text }.
export const buildMonthlyReminder = ({ now = new Date(), authors, birthDate, recorded, siteUrl }) => {
  const last = monthName(previousMonth(now).start);
  const counts = new Map();
  for (const name of authors) counts.set(name, (counts.get(name) ?? 0) + 1);
  const byAuthor = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'));

  const written = authors.length
    ? `En ${last} la familia escribió ${authors.length === 1 ? '1 recuerdo' : `${authors.length} recuerdos`}: ${byAuthor.map(([name, n]) => `${name} (${n})`).join(', ')}.`
    : `En ${last} nadie escribió un recuerdo para Carlo.`;
  const age = ageAt(birthDate, now);
  const ageLine = age ? `Este mes ${age.replace('Carlo tenía', 'Carlo tiene')}.` : '';
  const missing = MILESTONES.map((m) => m.label).filter((label) => !recorded.has(label));
  const firsts = missing.length
    ? `Primeras veces sin recuerdo todavía: ${missing.join(', ')}.`
    : 'Todas las primeras veces de la lista ya tienen recuerdo.';
  const link = `${siteUrl}/create-memory`;
  const subject = authors.length ? `Carlo App: ${authors.length === 1 ? '1 recuerdo' : `${authors.length} recuerdos`} en ${last}` : `Carlo App: nadie escribió en ${last}`;

  const lines = [written, ageLine, firsts].filter(Boolean);
  const text = `${lines.join('\n\n')}\n\nEscribir un recuerdo: ${link}\n\nPuedes apagar este correo en Admin → Carlo.`;
  const html = `<div style="font-family:system-ui,sans-serif;color:#14274A;max-width:32rem">
${lines.map((line) => `<p style="line-height:1.5">${escapeHtml(line)}</p>`).join('\n')}
<p><a href="${escapeHtml(link)}" style="display:inline-block;background:#FFD23F;color:#14274A;border:2px solid #14274A;border-radius:999px;padding:.6rem 1.2rem;font-weight:700;text-decoration:none">Escribir un recuerdo</a></p>
<p style="color:#46607F;font-size:.85rem">Puedes apagar este correo en Admin → Carlo.</p>
</div>`;
  return { subject, html, text };
};

// The email on the morning a letter opens: who wrote it and a link. Never the letter itself.
export const buildLetterOpened = ({ author, writtenOn, url }) => {
  const subject = `Hoy se abrió una carta de ${author}`;
  const line = `La carta con candado que ${author} escribió${writtenOn ? ` el ${writtenOn}` : ''} se abrió hoy.`;
  return {
    subject,
    text: `${line}\n\nLéela en Carlo App: ${url}`,
    html: `<div style="font-family:system-ui,sans-serif;color:#14274A;max-width:32rem">
<p style="line-height:1.5">${escapeHtml(line)}</p>
<p><a href="${escapeHtml(url)}" style="display:inline-block;background:#FFD23F;color:#14274A;border:2px solid #14274A;border-radius:999px;padding:.6rem 1.2rem;font-weight:700;text-decoration:none">Leer la carta</a></p>
</div>`,
  };
};
