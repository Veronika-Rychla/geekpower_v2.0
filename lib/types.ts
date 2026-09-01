export interface User {
  guid: string;
  name: string;
  email: string;
  role: "admin" | "user";
  password_hash: string;
}
