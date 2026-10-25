// The permission table from the spec, as HTTP status codes per role.
// tests/integration/permissions.test.js generates one test per cell, so a new
// row or role here is a new set of tests. Roles:
//   visitante  not signed in
//   autor      signed in, wrote the memory being acted on
//   familiar   signed in, did not write it
export const ROLES = ['visitante', 'autor', 'familiar'];

export const PERMISSIONS = [
  { action: 'list memories', visitante: 401, autor: 200, familiar: 200 },
  { action: 'read a memory', visitante: 401, autor: 200, familiar: 200 },
  { action: 'write a memory', visitante: 401, autor: 201, familiar: 201 },
  { action: 'edit a memory', visitante: 401, autor: 200, familiar: 403 },
  { action: 'delete a memory', visitante: 401, autor: 204, familiar: 403 },
];
