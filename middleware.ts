import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth?.token;
    const { pathname } = req.nextUrl;

    // Client users can only access limited routes
    if (token?.role === 'CLIENTE') {
      const clientRoutes = ['/dashboard', '/mis-solicitudes', '/mis-resultados'];
      const isAllowed = clientRoutes.some((r: string) => pathname.startsWith(r));
      if (!isAllowed && !pathname.startsWith('/api')) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/clientes/:path*',
    '/solicitudes/:path*',
    '/cotizaciones/:path*',
    '/ordenes/:path*',
    '/muestras/:path*',
    '/resultados/:path*',
    '/reportes/:path*',
    '/indicadores/:path*',
    '/etiquetas/:path*',
    '/auditoria/:path*',
    '/configuracion/:path*',
    '/usuarios/:path*',
    '/mis-solicitudes/:path*',
    '/mis-resultados/:path*',
  ],
};
