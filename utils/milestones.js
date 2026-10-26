// Primeras veces: one-tap milestones on the memory form. A milestone memory
// becomes its own event on the timeline, named by `title` (speaking to Carlo).
export const MILESTONES = [
  { label: 'Primera sonrisa', title: 'Tu primera sonrisa' },
  { label: 'Primer diente', title: 'Tu primer diente' },
  { label: 'Primera palabra', title: 'Tu primera palabra' },
  { label: 'Primeros pasos', title: 'Tus primeros pasos' },
  { label: 'Primer cumpleaños', title: 'Tu primer cumpleaños' },
  { label: 'Primer día de escuela', title: 'Tu primer día de escuela' },
];

export const MAX_MILESTONE_LENGTH = 60;

// The event name for a milestone: the fixed title for one from the list,
// otherwise what the family wrote ("Primera vez en el mar").
export const milestoneTitle = (milestone) =>
  MILESTONES.find((m) => m.label === milestone)?.title ?? milestone;

// '' for none; trims and limits what someone typed. Returns { milestone } or { error }.
export const parseMilestone = (value) => {
  if (value === undefined || value === null) return { milestone: '' };
  if (typeof value !== 'string') return { error: 'La primera vez no es válida' };
  const milestone = value.trim();
  if (milestone.length > MAX_MILESTONE_LENGTH) return { error: 'La primera vez es demasiado larga' };
  return { milestone };
};
