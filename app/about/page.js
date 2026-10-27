import Link from 'next/link';

export const metadata = { title: 'Acerca de' };

export default function About() {
  return (
    <section className="mx-auto mt-6 max-w-2xl">
      <h1 className="text-4xl font-bold">Acerca de</h1>
      <p className="mt-4 text-lg leading-relaxed">
        Carlo App es donde la familia de Carlo le guarda recuerdos mientras crece: lo que vivimos con él, fotos, notas
        de voz, sus primeras palabras y cartas que se abren solas cuando llega su fecha. Cuando Carlo cumpla la edad
        que la familia eligió, podrá entrar a leerlo todo.
      </p>
      <p className="mt-4 text-lg leading-relaxed">
        Es una aplicación privada: solo entra la familia. <Link href="/privacidad" className="link">Lee qué guardamos y quién lo ve</Link>.
      </p>
    </section>
  );
}
