import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login - CRM',
  description: 'Sign in to CRM',
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="stylesheet" href="/styles.css" />
        <link rel="stylesheet" href="/custom.css" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
