import { auth } from "@/auth";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { UserDashboard } from "@/components/dashboard/user-dashboard";

export default async function DashboardPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "admin";

  return isAdmin ? <AdminDashboard /> : <UserDashboard />;
}
