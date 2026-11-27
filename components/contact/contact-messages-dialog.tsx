"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ContactMessageList } from "@/components/contact/contact-message-list";
import type { ContactMessage } from "@/lib/types";
import { useDictionary } from "@/components/i18n-provider";
import { fill } from "@/lib/i18n";

interface ContactMessagesDialogProps {
  /** Every message, resolved and unresolved. */
  messages: ContactMessage[];
  canDelete?: boolean;
}

export function ContactMessagesDialog({ messages, canDelete = false }: ContactMessagesDialogProps) {
  const t = useDictionary().contact;
  const unresolvedCount = messages.filter((m) => !m.resolved).length;
  // Unresolved first. The DB returns newest first and sort() is stable, so that order holds within each group.
  const sorted = messages.toSorted((a, b) => Number(a.resolved) - Number(b.resolved));

  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>{t.showAll}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t.allTitle}</DialogTitle>
          <DialogDescription>
            {fill(t.summary, { total: messages.length, unresolved: unresolvedCount })}
          </DialogDescription>
        </DialogHeader>
        <ContactMessageList
          messages={sorted}
          canDelete={canDelete}
          clamp={false}
          className="h-auto max-h-[70vh]"
        />
      </DialogContent>
    </Dialog>
  );
}
