import type { AnnouncementView, BlogMessage } from "@/lib/types";
import { AnnouncementList } from "@/components/announcements/announcement-list";
import { BlogPostList } from "@/components/blog/blog-post-list";
import { DashboardSection } from "@/components/dashboard/dashboard-section";

interface UserDashboardProps {
  announcements: AnnouncementView[];
  blogPosts: BlogMessage[];
}

export function UserDashboard({ announcements, blogPosts }: UserDashboardProps) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold">User Dashboard</h1>
      <div className="flex flex-wrap gap-6">
        <DashboardSection title="Announcements">
          <AnnouncementList announcements={announcements} />
        </DashboardSection>
        <DashboardSection title="Blog">
          <BlogPostList posts={blogPosts} />
        </DashboardSection>
      </div>
    </div>
  );
}
