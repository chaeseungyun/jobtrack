import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE_NAME = "jobtrack_auth";

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  // 인증된 사용자가 접근해서는 안 되는 경로 (로그인/회원가입 페이지)
  const isAuthPage = pathname.startsWith("/auth");
  // 루트 경로 (랜딩 페이지)
  const isRootPage = pathname === "/";
  // 보호된 경로들
  const isProtectedPage = 
    pathname.startsWith("/dashboard") || 
    pathname.startsWith("/applications") || 
    pathname.startsWith("/board");

  // 랜딩 페이지 강제 조회 파라미터 확인 (?landing=true)
  const isLandingBypass = searchParams.get("landing") === "true";

  // 1. 인증된 사용자가 루트나 인증 페이지에 접근하는 경우 -> 대시보드로 리다이렉트
  if (token && (isAuthPage || (isRootPage && !isLandingBypass))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // 2. 인증되지 않은 사용자가 보호된 페이지에 접근하는 경우 -> 인증 페이지로 리다이렉트
  if (!token && isProtectedPage) {
    const loginUrl = new URL("/auth", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|swagger).*)",
  ],
};
