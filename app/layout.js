import '@styles/globals.css';
import { Caveat, Fredoka, Nunito } from 'next/font/google';
import Link from 'next/link';
import Nav from '@components/Nav';
import Provider from '@components/Provider';

// Fonts chosen in DESIGN.md: Fredoka for headings, Nunito for reading.
const display = Fredoka({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const body = Nunito({ subsets: ['latin'], variable: '--font-body', display: 'swap' });
// Handwriting for instant-photo captions.
const hand = Caveat({ subsets: ['latin'], variable: '--font-hand', display: 'swap' });

export const metadata = {
  // Each page names itself: 'Línea del tiempo · Carlo App'.
  title: { default: 'Carlo App', template: '%s · Carlo App' },
  description: 'Recuerdos y mensajes de la familia para Carlo.',
};

const RootLayout = ({ children }) => (
  <html lang="es" className={`${display.variable} ${body.variable} ${hand.variable}`}>
    <body>
      <Provider>
        <div className="app">
          <Nav />
          <main className="flex-1">{children}</main>
          <footer className="mt-16 flex flex-wrap gap-x-6 gap-y-2 border-t-2 border-ink/10 py-6 text-sm text-ink-soft">
            <Link href="/about" className="link">Acerca de</Link>
            <Link href="/privacidad" className="link">Privacidad</Link>
          </footer>
        </div>
      </Provider>
    </body>
  </html>
);

export default RootLayout;
