import '@styles/globals.css';
import { Caveat, Fredoka, Nunito } from 'next/font/google';
import Nav from '@components/Nav';
import Provider from '@components/Provider';

// Fonts chosen in DESIGN.md: Fredoka for headings, Nunito for reading.
const display = Fredoka({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const body = Nunito({ subsets: ['latin'], variable: '--font-body', display: 'swap' });
// Handwriting for instant-photo captions.
const hand = Caveat({ subsets: ['latin'], variable: '--font-hand', display: 'swap' });

export const metadata = {
  title: 'Carlo App',
  description: 'Recuerdos y mensajes de la familia para Carlo.',
};

const RootLayout = ({ children }) => (
  <html lang="es" className={`${display.variable} ${body.variable} ${hand.variable}`}>
    <body>
      <Provider>
        <div className="app">
          <Nav />
          <main className="flex-1">{children}</main>
        </div>
      </Provider>
    </body>
  </html>
);

export default RootLayout;
