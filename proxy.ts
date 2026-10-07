import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic auth gate: bounce signed-out visitors away from private areas
 * before rendering. Real authorisation (role checks, ownership) happens on the
 * server in every page, action and route handler — this is only a fast path.
 */
const SESSION_COOKIE = "ps_session";

export function proxy(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/passenger/:path*", "/driver/:path*", "/admin/:path*", "/book/:path*", "/notifications"],
};
