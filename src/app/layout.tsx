import type { Metadata } from "next";
import { Bebas_Neue, Comfortaa, DM_Mono } from "next/font/google";
import "./globals.css";

const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-bebas",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-mono",
});

const comfortaa = Comfortaa({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-comfortaa",
});

export const metadata: Metadata = {
  title: "AssembleOne",
  description: "AssembleOne is an AI-powered command center for founder operations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${bebasNeue.variable} ${dmMono.variable} ${comfortaa.variable}`}
    >
      <body>
        <div className="grain" />
        <div className="scanlines" />
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="app-root">{children}</div>
      </body>
    </html>
  );
}
