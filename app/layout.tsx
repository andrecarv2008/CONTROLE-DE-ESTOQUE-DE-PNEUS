import type {Metadata} from 'next';
import { Inter, Hanken_Grotesk } from 'next/font/google';
import './globals.css'; // Global styles

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const hankenGrotesk = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Gestão de Pneus - Grupo Mateus',
  description: 'Painel de Controle de Estoque e Logística de Pneus.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${hankenGrotesk.variable}`}>
      <body className="font-sans antialiased text-slate-900 bg-[#f7f9fb]" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
