// The permission table from the spec, as HTTP status codes per role.
// tests/integration/permissions.test.js generates one test per cell, so a new
// row or role here is a new set of tests. Roles:
//   visitante  not signed in
//   pendiente  signed in with Google, not on the allow list yet
//   autor      on the list, wrote the memory being acted on
//   familiar   on the list, did not write it
//   admin      the admin, did not write it
export const ROLES = ['visitante', 'pendiente', 'autor', 'familiar', 'admin'];

export const PERMISSIONS = [
  { action: 'list memories', visitante: 401, pendiente: 403, autor: 200, familiar: 200, admin: 200 },
  { action: 'read a memory', visitante: 401, pendiente: 403, autor: 200, familiar: 200, admin: 200 },
  { action: 'write a memory', visitante: 401, pendiente: 403, autor: 201, familiar: 201, admin: 201 },
  { action: 'edit a memory', visitante: 401, pendiente: 403, autor: 200, familiar: 403, admin: 200 },
  { action: 'delete a memory', visitante: 401, pendiente: 403, autor: 204, familiar: 403, admin: 204 },
  { action: 'join with the family code', visitante: 401, pendiente: 200, autor: 200, familiar: 200, admin: 200 },
  { action: 'see the family list', visitante: 401, pendiente: 403, autor: 403, familiar: 403, admin: 200 },
  { action: 'add someone to the family', visitante: 401, pendiente: 403, autor: 403, familiar: 403, admin: 201 },
  { action: 'remove someone from the family', visitante: 401, pendiente: 403, autor: 403, familiar: 403, admin: 204 },
  { action: 'change the family code', visitante: 401, pendiente: 403, autor: 403, familiar: 403, admin: 200 },
  { action: "see Carlo's birth date", visitante: 401, pendiente: 403, autor: 200, familiar: 200, admin: 200 },
  { action: "change Carlo's birth date", visitante: 401, pendiente: 403, autor: 403, familiar: 403, admin: 200 },
  { action: 'add a photo to a memory', visitante: 401, pendiente: 403, autor: 201, familiar: 403, admin: 201 },
  { action: 'see a photo', visitante: 401, pendiente: 403, autor: 200, familiar: 200, admin: 200 },
  { action: 'download the backup', visitante: 401, pendiente: 403, autor: 403, familiar: 403, admin: 200 },
  { action: 'see the timeline', visitante: 401, pendiente: 403, autor: 200, familiar: 200, admin: 200 },
  { action: 'rename a moment', visitante: 401, pendiente: 403, autor: 403, familiar: 403, admin: 200 },
  { action: 'reorganize the timeline', visitante: 401, pendiente: 403, autor: 403, familiar: 403, admin: 200 },
  { action: 'see the family pages', visitante: 401, pendiente: 403, autor: 200, familiar: 200, admin: 200 },
  { action: 'change my name', visitante: 401, pendiente: 403, autor: 200, familiar: 200, admin: 200 },
  { action: 'read the dictionary', visitante: 401, pendiente: 403, autor: 200, familiar: 200, admin: 200 },
  { action: 'add a word', visitante: 401, pendiente: 403, autor: 201, familiar: 201, admin: 201 },
  { action: 'edit a word', visitante: 401, pendiente: 403, autor: 200, familiar: 403, admin: 200 },
  { action: 'delete a word', visitante: 401, pendiente: 403, autor: 204, familiar: 403, admin: 204 },
];
