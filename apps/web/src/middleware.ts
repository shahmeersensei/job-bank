import { NextResponse, type NextRequest } from 'next/server';
import { CORRELATION_HEADER, resolveCorrelationId } from '@/lib/http/correlation';
import { isProtectedPath } from '@/lib/http/protected-routes';

// Better Auth's session cookie (the __Secure- variant is used over HTTPS). Only presence is
// checked here; importing better-auth into the edge bundle would pull in unused JWT code.
const SESSION_COOKIES = ['jb.session_token', '__Secure-jb.session_token'];

/**
 * 1. Tags every request with a correlation id.
 * 2. Fast-path guard: dashboard pages without a session cookie go to /login?next=…
 *    (authoritative session + role checks run in each dashboard layout and API route).
 */
export function middleware(request: NextRequest) {
  const correlationId = resolveCorrelationId(request.headers.get(CORRELATION_HEADER));
  const { pathname, search } = request.nextUrl;

  const hasSession = SESSION_COOKIES.some((name) => Boolean(request.cookies.get(name)?.value));
  if (isProtectedPath(pathname) && !hasSession) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', `${pathname}${search}`);
    const redirect = NextResponse.redirect(login);
    redirect.headers.set(CORRELATION_HEADER, correlationId);
    return redirect;
  }

  const headers = new Headers(request.headers);
  headers.set(CORRELATION_HEADER, correlationId);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set(CORRELATION_HEADER, correlationId);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt).*)'],
};
