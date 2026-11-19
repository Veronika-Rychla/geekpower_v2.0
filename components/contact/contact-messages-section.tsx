import type { ContactMessage } from "@/lib/types";
import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { ContactMessageList } from "@/components/contact/contact-message-list";
import { ContactMessagesDialog } from "@/components/contact/contact-messages-dialog";

interface ContactMessagesSectionProps {
  /** Every message; the section lists only unresolved ones, the dialog shows all. */
  messages: ContactMessage[];
  /** Admins can delete messages; teachers can only resolve them. */
  canDelete?: boolean;
}

export function ContactMessagesSection({
  messages,
  canDelete = false,
}: ContactMessagesSectionProps) {
  const unresolved = messages.filter((m) => !m.resolved);

  return (
    <DashboardSection
      title={
        <span className="flex items-center gap-2">
          Contact messages
          <span
            className="rounded-full bg-sky-500/10 px-2 py-0.5 text-xs font-medium text-sky-700 tabular-nums dark:text-sky-300"
            aria-label={`${unresolved.length} unresolved`}
          >
            {unresolved.length} unresolved
          </span>
        </span>
      }
      actions={
        <ContactMessagesDialog messages={messages} canDelete={canDelete} />
      }
    >
      <ContactMessageList
        messages={unresolved}
        canDelete={canDelete}
        emptyText="No unresolved messages."
      />
    </DashboardSection>
  );
}
