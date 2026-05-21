import './globals.css'
import Shell from '@/components/Shell'

export const metadata = { title: 'enCELL Master', description: 'Microfluidic chip flow prediction' }

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  )
}
