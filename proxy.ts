import { NextResponse } from "next/server";

import { auth } from "@/auth";

const PUBLIC_PATHS = ["/", "/forgot-password", "/set-password"];
/** Readable by everyone, signed in or not (no redirect either way). */
const OPEN_PATH_PREFIXES = ["/blog"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  if (OPEN_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return;
  }

  const isPublic = PUBLIC_PATHS.includes(pathname);

  if (!req.auth && !isPublic) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  if (req.auth && isPublic) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }
});

export const config = {
  // The tab icons (app/favicon.ico, icon.svg, apple-icon.png) must load signed out too.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png).*)"],
};
