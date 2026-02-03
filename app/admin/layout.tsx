'use client';

import { Container } from '@mantine/core';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    // UserNav will handle the navigation for admin pages too
    // It will show admin-specific buttons when on /admin routes
    return (
        <Container fluid>
            {children}
        </Container>
    );
}
