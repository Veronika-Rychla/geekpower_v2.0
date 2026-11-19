import { auth } from "@/auth";
import { hasAdminAccess, hasTeacherAccess } from "@/lib/utils";
import { getAnnouncements } from "@/lib/announcements";
import { getBlogPosts } from "@/lib/blog";
import { getContactMessages } from "@/lib/contact";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { TeacherDashboard } from "@/components/dashboard/teacher-dashboard";
import { UserDashboard } from "@/components/dashboard/user-dashboard";

export default async function DashboardPage() {
  const session = await auth();

  const isAdmin = hasAdminAccess(session?.user?.role);
  const isTeacher = hasTeacherAccess(session?.user?.role);

  // Drafts are visible only to the people who can manage posts
  // Contact messages hold visitors' personal data, so students never load them
  const [announcements, blogPosts, contactMessages] = await Promise.all([
    getAnnouncements(),
    getBlogPosts({ includeDrafts: isTeacher }),
    isTeacher ? getContactMessages() : Promise.resolve([]),
  ]);

  if (isAdmin) {
    return (
      <AdminDashboard
        announcements={announcements}
        blogPosts={blogPosts}
        contactMessages={contactMessages}
      />
    );
  }

  if (isTeacher) {
    return (
      <TeacherDashboard
        announcements={announcements}
        blogPosts={blogPosts}
        contactMessages={contactMessages}
      />
    );
  }

  return <UserDashboard announcements={announcements} blogPosts={blogPosts} />;
}
