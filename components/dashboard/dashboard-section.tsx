import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardSectionProps {
  title: string;
  /** Rendered in the top-right corner of the header, e.g. a "New" button. */
  actions?: ReactNode;
  children: ReactNode;
  /** Overrides the default half width (full width on small screens). */
  className?: string;
}

export function DashboardSection({ title, actions, children, className }: DashboardSectionProps) {
  return (
    <Card className={cn("w-full md:w-[calc(50%-0.75rem)]", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {actions && <CardAction>{actions}</CardAction>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
