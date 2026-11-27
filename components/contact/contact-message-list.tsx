"use client";

import type { ContactMessage } from "@/lib/types";
import { formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { deleteContactMessage } from "@/lib/actions";
import { ClampedText } from "@/components/clamped-text";
import { DeleteDialog } from "@/components/delete-dialog";
import { ResolveButton } from "@/components/contact/resolve-button";
import { useDictionary, useLocale } from "@/components/i18n-provider";
import { fill } from "@/lib/i18n";

interface ContactMessageListProps {
  messages: ContactMessage[];
  /** Shows a delete button on each message (admins only). */
  canDelete?: boolean;
  emptyText?: string;
  /** Clamps long names/messages with the full text in a tooltip; false shows them in full. */
  clamp?: boolean;
  /** Overrides the list's fixed height, e.g. inside a dialog. */
  className?: string;
}

export function ContactMessageList({
  messages,
  canDelete = false,
  emptyText,
  clamp = true,
  className,
}: ContactMessageListProps) {
  const t = useDictionary().contact;
  const locale = useLocale();

  if (messages.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyText ?? t.empty}</p>;
  }

  return (
    <ul className={cn("-mr-2 flex h-112 flex-col divide-y divide-foreground/10 overflow-y-auto pr-2", className)}>
      {messages.map((contact) => (
        <li
          key={contact.guid}
          className={cn("flex flex-col gap-1 py-3 first:pt-0 last:pb-0", contact.resolved && "opacity-60")}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-col items-start gap-0.5">
              {contact.resolved && (
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  {t.resolved}
                </span>
              )}
              {clamp ? (
                <ClampedText text={contact.name} render={<h3 className="line-clamp-2 font-medium break-words" />} />
              ) : (
                <h3 className="font-medium break-words">{contact.name}</h3>
              )}
              <a
                href={`mailto:${contact.email}`}
                className="text-sm break-all text-muted-foreground underline-offset-4 hover:underline"
              >
                {contact.email}
              </a>
            </div>
            <div className="-mt-1 flex shrink-0 gap-1">
              <ResolveButton guid={contact.guid} resolved={contact.resolved} />
              {canDelete && (
                <DeleteDialog
                  item="contactMessage"
                  title={fill(t.messageFrom, { name: contact.name })}
                  onDelete={deleteContactMessage.bind(null, contact.guid)}
                />
              )}
            </div>
          </div>
          {clamp ? (
            <ClampedText
              text={contact.message}
              render={<p className="line-clamp-5 whitespace-pre-wrap break-words text-muted-foreground" />}
            />
          ) : (
            <p className="whitespace-pre-wrap break-words text-muted-foreground">{contact.message}</p>
          )}
          <p className="text-right text-xs text-muted-foreground">{formatDateTime(contact.createdAt, locale)}</p>
        </li>
      ))}
    </ul>
  );
}
