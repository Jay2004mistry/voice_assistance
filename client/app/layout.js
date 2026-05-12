import './globals.css'

export const metadata = {
  title: 'AI Voice Assistant',
  description: 'Real-time voice AI assistant with MongoDB backend',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}