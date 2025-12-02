import { Inter } from 'next/font/google';
import AppProviders from '../../lib/appProviders';
import './globals.css';


const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter',
})


export const metadata = {
  title: "Rainmaker - Empowering Teams to Achieve More",
  description: "A platform that helps teams collaborate and grow.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
