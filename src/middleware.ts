import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    const adminSession = request.cookies.get('admin_session')
    const path = request.nextUrl.pathname

    // Redirect root to login if not authenticated
    if (path === '/' && !adminSession) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // Allow root for authenticated users (don't redirect)

    // Protect dashboard routes
    if (path.startsWith('/dashboard')) {
        if (!adminSession) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
    }

    // Redirect to homepage if already logged in and visiting login
    if (path === '/login' && adminSession) {
        return NextResponse.redirect(new URL('/', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/', '/dashboard/:path*', '/login'],
}