import { Inter } from 'next/font/google';
import { AuthProvider } from '/lib/authContext';
import Footer from '~/components/Footer';
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
        <AuthProvider>
          <div className="flex min-h-screen flex-col">
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
