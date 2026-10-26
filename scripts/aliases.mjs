import { registerHooks } from 'node:module';

// Lets the scripts load the app's plain helpers, which import each other as
// '@utils/…' (jsconfig.json paths) the way Next resolves them. They are ES
// modules in a package without "type": "module", so say so.
const root = new URL('../', import.meta.url);

registerHooks({
  resolve: (specifier, context, next) =>
    specifier.startsWith('@utils/')
      ? { url: new URL(`${specifier.slice(1)}.js`, root).href, format: 'module', shortCircuit: true }
      : next(specifier, context),
});
