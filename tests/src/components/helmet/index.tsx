import type { ReactNode } from 'react';

export interface HelmetProps {
  children: ReactNode;
}

export function Helmet({ children }: HelmetProps) {
  return (
    <html>
      <head>
        <title>Home page</title>
      </head>
      <body>{children}</body>
    </html>
  );
}
