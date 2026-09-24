import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Eylite — Votre établissement, simplement",
  description: "Gestion scolaire, pédagogique et financière des établissements.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
