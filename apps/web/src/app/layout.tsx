import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Financial Advisor Workflow',
  description: 'AI-powered workflow platform for financial advisors',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="cs">
      <body>
        <div className="layout">
          <aside className="sidebar">
            <h1>FAW Platform</h1>
            <p>Financial Advisor Workflow</p>
            <nav>
              <a href="/">Dashboard</a>
              <a href="/cases">Schuzky</a>
              <a href="/clients">Klienti</a>
            </nav>
          </aside>
          <main className="main">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
