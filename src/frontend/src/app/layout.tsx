import type { Metadata } from 'next'
import { Nunito, Inter } from 'next/font/google'
import './globals.css'

// next/font descarga las fuentes en build-time y las sirve sin CDN externo.
// Las variables CSS quedan disponibles para el @theme de globals.css.
const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['400', '500', '600'],
})

export const metadata: Metadata = {
  title: 'MindBridge — Tu espacio seguro',
  description:
    'Foro de triaje proactivo para el bienestar universitario. ' +
    'Publica de forma anónima y recibe apoyo profesional cuando lo necesites.',
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="es" className={`${nunito.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                var theme = localStorage.getItem('theme');
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                }
              } catch(e) {}
            })();
          `
        }} />
      </head>
      <body>{children}</body>
    </html>
  )
}