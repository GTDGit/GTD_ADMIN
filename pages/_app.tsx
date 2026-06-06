import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import { ToastProvider } from '@/components/Toast'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ToastProvider>
      <Head>
        <link rel="icon" type="image/png" href="/logo_gtd.png" />
        <meta name="theme-color" content="#2563eb" />
      </Head>
      <Component {...pageProps} />
    </ToastProvider>
  )
}
