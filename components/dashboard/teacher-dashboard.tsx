import type { AnnouncementView, BlogMessage, ContactMessage } from "@/lib/types";
import { AnnouncementDialog } from "@/components/announcements/announcement-dialog";
import { AnnouncementList } from "@/components/announcements/announcement-list";
import { BlogPostList, NewBlogPostLink } from "@/components/blog/blog-post-list";
import { ContactMessagesSection } from "@/components/contact/contact-messages-section";
import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { getDictionary } from "@/lib/dictionary";

interface TeacherDashboardProps {
  announcements: AnnouncementView[];
  blogPosts: BlogMessage[];
  contactMessages: ContactMessage[];
}

export async function TeacherDashboard({ announcements, blogPosts, contactMessages }: TeacherDashboardProps) {
  const t = (await getDictionary()).dashboard;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold">{t.teacherTitle}</h1>
      <div className="flex flex-wrap gap-6">
        <DashboardSection title={t.announcements} actions={<AnnouncementDialog />}>
          <AnnouncementList announcements={announcements} canManage />
        </DashboardSection>
        <DashboardSection title={t.blog} actions={<NewBlogPostLink />}>
          <BlogPostList posts={blogPosts} canManage />
        </DashboardSection>
        <ContactMessagesSection messages={contactMessages} />
      </div>
    </div>
  );
}
