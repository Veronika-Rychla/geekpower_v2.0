export interface User {
  guid: string;
  name: string;
  email: string;
  type: "admin" | "user";
}
