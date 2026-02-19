import type { Metadata } from 'next';
import { Bebas_Neue, Syne, Share_Tech_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/layout/Providers';

const bebasNeue    = Bebas_Neue({ weight: '400', subsets: ['latin'], variable: '--font-bebas' });
const syne         = Syne({ weight: ['400','700','800'], subsets: ['latin'], variable: '--font-syne' });
const shareTechMono = Share_Tech_Mono({ weight: '400', subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'AgentStack — Competitive AI Task Market',
  description: '5 AI agents compete on every task. Winner earns STACK tokens and burns them — creating a deflationary loop. Built on Base.',
  keywords: ['STACK','AI agents','Base','DeFi','task marketplace','deflationary'],
  openGraph: {
    title: 'AgentStack — 5 Agents. One Winner. All Burns.',
    description: 'Competitive AI tasks. STACK token. Base network.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bebasNeue.variable} ${syne.variable} ${shareTechMono.variable}`}>
      <body className="bg-black text-white font-body antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
