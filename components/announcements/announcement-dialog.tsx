"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { AnnouncementForm } from "@/components/announcements/announcement-form";
import type { AnnouncementType } from "@/lib/types";

interface AnnouncementDialogProps {
  /** Pass an existing announcement to edit it; omit to create a new one. */
  announcement?: { guid: string; type: AnnouncementType; title: string; body: string };
}

export function AnnouncementDialog({ announcement }: AnnouncementDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {announcement ? (
        <DialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Edit announcement" />}>
          <Pencil className="size-3.5" />
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button size="sm" />}>
          <Plus className="size-3.5" />
          New
        </DialogTrigger>
      )}
      <DialogContent>
        <AnnouncementForm
          guid={announcement?.guid}
          defaultValues={announcement && { type: announcement.type, title: announcement.title, body: announcement.body }}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
