import type { AnnouncementView, BlogMessage, ContactMessage } from "@/lib/types";
import { AnnouncementDialog } from "@/components/announcements/announcement-dialog";
import { AnnouncementList } from "@/components/announcements/announcement-list";
import { BlogPostDialog } from "@/components/blog/blog-post-dialog";
import { BlogPostList } from "@/components/blog/blog-post-list";
import { ContactMessagesSection } from "@/components/contact/contact-messages-section";
import { DashboardSection } from "@/components/dashboard/dashboard-section";

interface TeacherDashboardProps {
  announcements: AnnouncementView[];
  blogPosts: BlogMessage[];
  contactMessages: ContactMessage[];
}

export function TeacherDashboard({ announcements, blogPosts, contactMessages }: TeacherDashboardProps) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold">Teacher Dashboard</h1>
      <div className="flex flex-wrap gap-6">
        <DashboardSection title="Announcements" actions={<AnnouncementDialog />}>
          <AnnouncementList announcements={announcements} canManage />
        </DashboardSection>
        <DashboardSection title="Blog" actions={<BlogPostDialog />}>
          <BlogPostList posts={blogPosts} canManage />
        </DashboardSection>
        <ContactMessagesSection messages={contactMessages} />
      </div>
    </div>
  );
}
