declare module "@auth/core/types" {
  interface User {
    role?: "admin" | "user";
    guid?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role?: "admin" | "user";
  }
}
