export const MAX_MEMORY_LENGTH = 5000;
export const MAX_TAG_LENGTH = 50;

// Returns { memory, tag } on success, or { error } with a message for the user.
export const parseMemoryInput = (body) => {
  const memory = typeof body?.memory === 'string' ? body.memory.trim() : '';
  const tag = typeof body?.tag === 'string' ? body.tag.trim() : '';

  if (!memory || !tag) {
    return { error: 'El recuerdo y la categoría son obligatorios' };
  }
  if (memory.length > MAX_MEMORY_LENGTH || tag.length > MAX_TAG_LENGTH) {
    return { error: 'El texto es demasiado largo' };
  }
  return { memory, tag };
};

export const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
