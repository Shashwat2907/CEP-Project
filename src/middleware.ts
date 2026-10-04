import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isSupabaseOnline } from '@/lib/supabase/status'

/**
 * Next.js Middleware: Supabase session refresh and route protection.
 * Source of truth: documents/PLAN.MD §4, §4.1
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const { pathname } = request.nextUrl

  // Ignore static assets and media files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return supabaseResponse
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // In test or local environments without Supabase configured yet, allow route passage
  if (!supabaseUrl || !supabaseKey) {
    return supabaseResponse
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        supabaseResponse = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  // Refresh the session cookie
  let user: { id: string; email?: string } | null = null
  if (await isSupabaseOnline()) {
    try {
      const { data } = await supabase.auth.getUser()
      user = data.user
    } catch {
      // Offline / Supabase unreachable
    }
  }

  // Check dev mock session cookie if Supabase was offline
  const mockEmail = request.cookies.get('dev_mock_user_email')?.value
  if (!user && mockEmail) {
    user = { id: 'dev-mock-id', email: mockEmail }
  }

  const isAuthRoute = pathname.startsWith('/sign-in')

  // Redirect unauthenticated user from protected areas
  const isProtectedRoute =
    pathname.startsWith('/student') ||
    pathname.startsWith('/teacher') ||
    pathname.startsWith('/admin')

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/sign-in'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated user from sign-in to root unless explicitly switching accounts
  const isSwitching = request.nextUrl.searchParams.get('switch') === 'true'
  if (user && isAuthRoute && !isSwitching) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
