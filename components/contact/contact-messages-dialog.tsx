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

interface ContactMessagesDialogProps {
  /** Every message, resolved and unresolved. */
  messages: ContactMessage[];
  canDelete?: boolean;
}

export function ContactMessagesDialog({ messages, canDelete = false }: ContactMessagesDialogProps) {
  const unresolvedCount = messages.filter((m) => !m.resolved).length;
  // Unresolved first. The DB returns newest first and sort() is stable, so that order holds within each group.
  const sorted = messages.toSorted((a, b) => Number(a.resolved) - Number(b.resolved));

  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>Show all</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>All contact messages</DialogTitle>
          <DialogDescription>
            {messages.length} total, {unresolvedCount} unresolved
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
