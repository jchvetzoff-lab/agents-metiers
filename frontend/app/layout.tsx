import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import AuthGuard from "@/components/AuthGuard";
import LayoutShell from "@/components/LayoutShell";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Agents Métiers - Système Multi-Agents IA",
  description: "Génération automatique de fiches métiers professionnelles avec intelligence artificielle",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${inter.variable} ${playfair.variable} font-sans antialiased bg-white text-text-dark relative`}
      >
        <AuthGuard>
          <LayoutShell>
            {children}
          </LayoutShell>
        </AuthGuard>
      </body>
    </html>
  );
}
