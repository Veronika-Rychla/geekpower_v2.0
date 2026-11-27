import type { Locale } from "@/lib/i18n";
import type { Role } from "@/lib/types";

declare module "@auth/core/types" {
  interface User {
    role?: Role;
    guid?: string;
    /** The language saved in users.locale, if the user picked one. */
    locale?: Locale | null;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role?: Role;
    locale?: Locale | null;
  }
}
