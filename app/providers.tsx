"use client";

import { SessionProvider } from "next-auth/react";
import { MantineProvider, createTheme } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { DatesProvider } from "@mantine/dates";
import { ReactNode } from "react";
import { CartProvider } from "./_components/CartContext";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import "dayjs/locale/fr";

dayjs.extend(customParseFormat);
dayjs.locale("fr");

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
                    <DatesProvider settings={{ locale: "fr", firstDayOfWeek: 1 }}>
                        <Notifications />
                        {children}
                    </DatesProvider>
                </MantineProvider>
            </CartProvider>
        </SessionProvider>
    );
}
