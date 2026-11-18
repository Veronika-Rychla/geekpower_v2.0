import { auth } from "@/auth";
import { hasAdminAccess, hasTeacherAccess } from "@/lib/utils";
import { getAnnouncements } from "@/lib/announcements";
import { getBlogPosts } from "@/lib/blog";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { TeacherDashboard } from "@/components/dashboard/teacher-dashboard";
import { UserDashboard } from "@/components/dashboard/user-dashboard";

export default async function DashboardPage() {
  const session = await auth();

  const isAdmin = hasAdminAccess(session?.user?.role);
  const isTeacher = hasTeacherAccess(session?.user?.role);

  // Drafts are visible only to the people who can manage posts
  const [announcements, blogPosts] = await Promise.all([
    getAnnouncements(),
    getBlogPosts({ includeDrafts: isTeacher }),
  ]);

  if (isAdmin) {
    return (
      <AdminDashboard announcements={announcements} blogPosts={blogPosts} />
    );
  }

  if (isTeacher) {
    return (
      <TeacherDashboard announcements={announcements} blogPosts={blogPosts} />
    );
  }

  return <UserDashboard announcements={announcements} blogPosts={blogPosts} />;
}
