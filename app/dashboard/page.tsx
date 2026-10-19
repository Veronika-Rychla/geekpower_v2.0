import { auth } from "@/auth";
import { hasAdminAccess } from "@/lib/utils";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { UserDashboard } from "@/components/dashboard/user-dashboard";

export default async function DashboardPage() {
  const session = await auth();
  const isAdmin = hasAdminAccess(session?.user?.role);

  return isAdmin ? <AdminDashboard /> : <UserDashboard />;
}
