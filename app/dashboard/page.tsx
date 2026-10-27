import { auth } from "@/auth";
import { hasAdminAccess, hasTeacherAccess } from "@/lib/utils";
import { getAnnouncements } from "@/lib/announcements";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { TeacherDashboard } from "@/components/dashboard/teacher-dashboard";
import { UserDashboard } from "@/components/dashboard/user-dashboard";

export default async function DashboardPage() {
  const [session, announcements] = await Promise.all([auth(), getAnnouncements()]);

  const isAdmin = hasAdminAccess(session?.user?.role);
  const isTeacher = hasTeacherAccess(session?.user?.role);

  if (isAdmin) {
    return <AdminDashboard announcements={announcements} />;
  }

  if (isTeacher) {
    return <TeacherDashboard announcements={announcements} />;
  }

  return <UserDashboard announcements={announcements} />;
}
