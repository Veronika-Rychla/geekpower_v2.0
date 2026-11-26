"use client";

import { RobotError } from "@/components/mascot/robot-error";

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RobotError error={error} retry={retry} />;
}
