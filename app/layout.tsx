import type { Metadata } from "next";
import { Outfit } from "next/font/google"; // Premium typography
import { ColorSchemeScript, MantineProvider, createTheme } from "@mantine/core";
import { AuthProvider } from "./providers";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";
import { Notifications } from "@mantine/notifications";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"] });

const theme = createTheme({
  primaryColor: "indigo",
  fontFamily: outfit.style.fontFamily,
  defaultRadius: "md",
});

export const metadata: Metadata = {
  title: "Lunch Connect",
  description: "Order lunch for friends and family",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <ColorSchemeScript />
      </head>
      <body className={outfit.className}>
        <AuthProvider>
          <MantineProvider theme={theme}>
            <Notifications />
            {children}
          </MantineProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
