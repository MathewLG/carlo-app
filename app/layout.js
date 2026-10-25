import '@styles/globals.css';
import { Fredoka, Nunito } from 'next/font/google';
import Nav from '@components/Nav';
import Provider from '@components/Provider';

// Fonts chosen in DESIGN.md: Fredoka for headings, Nunito for reading.
const display = Fredoka({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const body = Nunito({ subsets: ['latin'], variable: '--font-body', display: 'swap' });

export const metadata = {
  title: 'Carlo App',
  description: 'Recuerdos y mensajes de la familia para Carlo.',
};

const RootLayout = ({ children }) => (
  <html lang="es" className={`${display.variable} ${body.variable}`}>
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
