import Feed from '@components/Feed';

const Home = () => (
  <section className="mt-6">
    <h1 className="max-w-3xl text-5xl font-bold leading-[1.1] sm:text-6xl">
      Compartiendo{' '}
      <span className="inline-block -rotate-2 rounded-xl border-2 border-ink bg-sky px-3 shadow-sticker-sm">
        recuerdos
      </span>
    </h1>
    <p className="mt-6 max-w-2xl text-lg text-ink-soft sm:text-xl">
      Carlo-App es una aplicación en la que puedes almacenar los momentos importantes con tu bebé de manera
      segura. Tú y sus seres queridos pueden enviarle mensajes mientras crece y darle acceso para leerlos cuando
      creas que es el momento adecuado.
    </p>
    <Feed />
  </section>
);

export default Home;
