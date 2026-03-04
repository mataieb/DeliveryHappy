"use client";

import { SessionProvider } from "next-auth/react";
import { MantineProvider, createTheme } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { ReactNode } from "react";
import { CartProvider } from "./_components/CartContext";

export function Providers({ children, fontFamily }: { children: ReactNode, fontFamily: string }) {
    const theme = createTheme({
        primaryColor: "indigo",
        fontFamily: fontFamily,
        defaultRadius: "md",
    });

    return (
        <SessionProvider>
            <CartProvider>
                <MantineProvider theme={theme}>
                    <Notifications />
                    {children}
                </MantineProvider>
            </CartProvider>
        </SessionProvider>
    );
}
