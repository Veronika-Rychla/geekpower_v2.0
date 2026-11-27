"use client";

import { useTransition } from "react";
import { Check, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { setContactMessageResolved } from "@/lib/actions";
import { useDictionary } from "@/components/i18n-provider";

interface ResolveButtonProps {
  guid: string;
  resolved: boolean;
}

/** Toggles a contact message between resolved and unresolved. */
export function ResolveButton({ guid, resolved }: ResolveButtonProps) {
  const [isPending, startTransition] = useTransition();
  const t = useDictionary().contact;
  const label = resolved ? t.markUnresolved : t.markResolved;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await setContactMessageResolved(guid, !resolved);
              })
            }
          />
        }
      >
        {resolved ? <RotateCcw className="size-3.5" /> : <Check className="size-3.5" />}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
