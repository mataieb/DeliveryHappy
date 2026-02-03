import { withAuth } from "next-auth/middleware";

export default withAuth({
    callbacks: {
        authorized({ req, token }) {
            // Admin routes require admin role
            if (req.nextUrl.pathname.startsWith("/admin")) {
                return token?.role === "ADMIN";
            }
            // Other protected routes just require being logged in
            return !!token;
        },
    },
});

export const config = { matcher: ["/menu/:path*", "/dashboard/:path*", "/admin/:path*"] }
