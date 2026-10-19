import type { Role } from "@/lib/types";

declare module "@auth/core/types" {
  interface User {
    role?: Role;
    guid?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role?: Role;
  }
}
