import { NextResponse, NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  // Log the incoming request to the server console (Docker logs)
  const url = request.nextUrl.pathname;
  console.log(`[Next.js Proxy] ${request.method} ${url}`);
  
  return NextResponse.next();
}


// Match all paths except static files and internal next paths
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
