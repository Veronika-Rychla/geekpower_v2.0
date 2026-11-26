"use client";

import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { MascotArt } from "@/components/mascot/mascot-art";

interface RobotErrorProps {
  error: Error & { digest?: string };
  retry: () => void;
}

/** Error screen: the robot short-circuits, sweats, and offers to try again. */
export function RobotError({ error, retry }: RobotErrorProps) {
  const [isPending, startTransition] = useTransition();
  const [eyes, setEyes] = useState({ left: { x: 0, y: 0 }, right: { x: 0, y: 0 } });

  useEffect(() => {
    console.error(error);
  }, [error]);

  // Panicked pupils darting around
  useEffect(() => {
    const id = setInterval(() => {
      const jitter = () => Math.round(Math.random() * 6 - 3);
      setEyes({ left: { x: jitter(), y: jitter() }, right: { x: jitter(), y: jitter() } });
    }, 450);
    return () => clearInterval(id);
  }, []);

  return (
    <div role="alert" className="flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-5 px-6 py-16 text-center">
      <div className="mascot-mood-shake size-36">
        <MascotArt variant="wild" staring sweating eyes={eyes} />
      </div>
      <div className="flex max-w-md flex-col gap-2">
        <h1 className="text-xl font-semibold">Oops, I tripped over a cable.</h1>
        <p className="text-sm text-muted-foreground">
          Something went wrong while loading this page. Often the database just needs a moment to wake up, so try
          again.
        </p>
        {error.digest && <p className="font-mono text-xs text-muted-foreground">Error code: {error.digest}</p>}
      </div>
      <Button disabled={isPending} onClick={() => startTransition(() => retry())}>
        {isPending ? "Plugging the cable back in…" : "Try again"}
      </Button>
    </div>
  );
}
