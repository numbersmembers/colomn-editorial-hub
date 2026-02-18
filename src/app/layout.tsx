import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'Column Editorial Hub',
  description: '복수 칼럼니스트 Generator를 지원하는 편집 플랫폼',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
