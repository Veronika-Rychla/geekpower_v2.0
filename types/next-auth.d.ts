declare module "@auth/core/types" {
  interface User {
    role?: "Admin" | "User";
    guid?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role?: "Admin" | "User";
  }
}
