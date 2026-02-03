export { default } from "next-auth/middleware"

export const config = { matcher: ["/menu/:path*", "/dashboard/:path*", "/admin/:path*"] }
