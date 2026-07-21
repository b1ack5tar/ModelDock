import type { Metadata } from 'next';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { APP_DESCRIPTION, APP_NAME } from '@/lib/constants';
import './globals.css';

export const metadata: Metadata = {
  title: `${APP_NAME} — 多模型 AI 对话工作台`,
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: 'var(--color-card)',
                color: 'var(--color-foreground)',
                border: '1px solid var(--color-border)',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
