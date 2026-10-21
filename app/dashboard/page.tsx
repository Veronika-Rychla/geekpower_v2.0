import { auth } from "@/auth";
import { hasAdminAccess, hasTeacherAccess } from "@/lib/utils";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { TeacherDashboard } from "@/components/dashboard/teacher-dashboard";
import { UserDashboard } from "@/components/dashboard/user-dashboard";

export default async function DashboardPage() {
  const session = await auth();

  const isAdmin = hasAdminAccess(session?.user?.role);
  const isTeacher = hasTeacherAccess(session?.user?.role);

  if (isAdmin) {
    return <AdminDashboard />;
  }

  if (isTeacher) {
    return <TeacherDashboard />;
  }

  return <UserDashboard />;
}
