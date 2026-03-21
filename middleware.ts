import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function hasSupabaseSessionCookie(req: NextRequest) {
  return req.cookies
    .getAll()
    .some(
      (cookie) =>
        cookie.name.startsWith("sb-") &&
        cookie.name.includes("auth-token") &&
        cookie.value.trim().length > 0,
    );
}

function getOnboardedCookie(req: NextRequest) {
  const value = req.cookies.get("ao_onboarded")?.value;
  return value === "1" || value === "0" ? value : null;
}

export function middleware(req: NextRequest) {
  const hasSession = hasSupabaseSessionCookie(req);
  const wantsDashboard = req.nextUrl.pathname.startsWith("/dashboard");
  const wantsOnboard = req.nextUrl.pathname === "/onboard";
  const enhanceMode = req.nextUrl.searchParams.get("mode") === "enhance";
  const onboarded = getOnboardedCookie(req);

  if (!hasSession && (wantsDashboard || wantsOnboard)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (hasSession && req.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (onboarded === "0" && wantsDashboard) {
    return NextResponse.redirect(new URL("/onboard", req.url));
  }

  if (onboarded === "1" && wantsOnboard && !enhanceMode) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (onboarded !== "1" && wantsOnboard && enhanceMode) {
    return NextResponse.redirect(new URL("/onboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/onboard", "/dashboard/:path*"],
};
