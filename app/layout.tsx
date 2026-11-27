import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import { auth } from "@/auth";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Providers } from "@/components/providers";
import { getDictionary, getLocale } from "@/lib/dictionary";
import { themeScript } from "@/lib/theme";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GeekPower",
  description: "GeekPower",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [session, locale, dictionary] = await Promise.all([
    auth(),
    getLocale(),
    getDictionary(),
  ]);

  return (
    // suppressHydrationWarning: the inline script below sets a saved color
    // theme on <html> (and drops `dark` for a light one).
    <html
      lang={locale}
      suppressHydrationWarning
      className={cn(
        "dark",
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
        inter.variable,
      )}
    >
      <head>
        {/* Applies the theme picked here or on the website before first paint (see lib/theme.ts). */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <Providers session={session} locale={locale} dictionary={dictionary}>
          <SiteHeader />
          <main className="flex flex-1 flex-col">{children}</main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
