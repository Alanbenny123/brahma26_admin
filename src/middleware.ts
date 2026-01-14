import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    const adminSession = request.cookies.get('admin_session')
    const path = request.nextUrl.pathname

    // Protect dashboard routes - check first
    if (path.startsWith('/dashboard')) {
        if (!adminSession) {
            const response = NextResponse.redirect(new URL('/login', request.url))
            // Ensure cookie is deleted
            response.cookies.delete('admin_session')
            return response
        }
    }

    // Redirect root to dashboard if authenticated, to login if not
    if (path === '/') {
        if (!adminSession) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
        return NextResponse.redirect(new URL('/dashboard/users', request.url))
    }

    // Redirect to dashboard if already logged in and visiting login
    if (path === '/login' && adminSession) {
        return NextResponse.redirect(new URL('/dashboard/users', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/', '/dashboard/:path*', '/login'],
}