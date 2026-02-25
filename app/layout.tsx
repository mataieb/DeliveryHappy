import type { Metadata } from "next";
import { Outfit } from "next/font/google"; // Premium typography
import { ColorSchemeScript } from "@mantine/core";
import { Providers } from "./providers";
import { UserNav } from "./_components/UserNav";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"] });



export const metadata: Metadata = {
  title: "Maitre Taieb's Kitchen",
  description: "Commandez votre déjeuner en quelques clics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <ColorSchemeScript />
      </head>
      <body className={outfit.className}>
        <Providers fontFamily={outfit.style.fontFamily}>
          <UserNav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
