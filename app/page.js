import Feed from '@components/Feed';
import CarloBanner from '@components/CarloBanner';

const Home = () => (
  <section className="mt-6">
    <h1 className="max-w-3xl text-4xl font-bold leading-[1.15] sm:text-6xl">
      Compartiendo{' '}
      <span className="inline-block -rotate-2 rounded-xl border-2 border-ink bg-sky px-3 shadow-sticker-sm">
        recuerdos
      </span>
    </h1>
    <p className="mt-6 max-w-2xl text-lg text-ink-soft sm:text-xl">
      Carlo-App guarda de manera segura los momentos importantes de la vida de Carlo. Su familia le escribe
      mientras crece, y él podrá entrar a leerlo todo cuando cumpla la edad que la familia eligió.
    </p>
    <CarloBanner />
    <Feed />
  </section>
);

export default Home;
