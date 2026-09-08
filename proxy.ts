import { NextResponse } from "next/server";

import { auth } from "@/auth";

const PUBLIC_PATHS = ["/", "/forgot-password", "/set-password"];

export default auth((req) => {
  const isPublic = PUBLIC_PATHS.includes(req.nextUrl.pathname);

  if (!req.auth && !isPublic) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  if (req.auth && isPublic) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
