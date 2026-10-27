import type { AnnouncementView } from "@/lib/types";
import { AnnouncementDialog } from "@/components/announcements/announcement-dialog";
import { AnnouncementList } from "@/components/announcements/announcement-list";
import { DashboardSection } from "@/components/dashboard/dashboard-section";

interface TeacherDashboardProps {
  announcements: AnnouncementView[];
}

export function TeacherDashboard({ announcements }: TeacherDashboardProps) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold">Teacher Dashboard</h1>
      <div className="flex flex-wrap gap-6">
        <DashboardSection title="Announcements" actions={<AnnouncementDialog />}>
          <AnnouncementList announcements={announcements} canManage />
        </DashboardSection>
      </div>
    </div>
  );
}
