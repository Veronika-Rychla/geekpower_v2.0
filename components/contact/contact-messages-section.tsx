import type { ContactMessage } from "@/lib/types";
import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { ContactMessageList } from "@/components/contact/contact-message-list";
import { ContactMessagesDialog } from "@/components/contact/contact-messages-dialog";
import { getDictionary } from "@/lib/dictionary";
import { fill } from "@/lib/i18n";

interface ContactMessagesSectionProps {
  /** Every message; the section lists only unresolved ones, the dialog shows all. */
  messages: ContactMessage[];
  /** Admins can delete messages; teachers can only resolve them. */
  canDelete?: boolean;
}

export async function ContactMessagesSection({
  messages,
  canDelete = false,
}: ContactMessagesSectionProps) {
  const t = (await getDictionary()).contact;
  const unresolved = messages.filter((m) => !m.resolved);
  const unresolvedLabel = fill(t.unresolved, { count: unresolved.length });

  return (
    <DashboardSection
      title={
        <span className="flex items-center gap-2">
          {t.title}
          <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-xs font-medium text-sky-700 tabular-nums dark:text-sky-300">
            {unresolvedLabel}
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
        emptyText={t.emptyUnresolved}
      />
    </DashboardSection>
  );
}
