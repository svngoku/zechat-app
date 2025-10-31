"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 px-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="font-display text-2xl font-semibold">Something went wrong!</h2>
        <p className="text-muted-foreground font-sans text-sm">
          {error.message || "An unexpected error occurred"}
        </p>
        {error.digest && (
          <p className="text-muted-foreground font-mono text-xs">
            Error ID: {error.digest}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <Button onClick={() => reset()} variant="default">
          Try again
        </Button>
        <Button onClick={() => window.location.href = "/"} variant="outline">
          Go home
        </Button>
      </div>
    </div>
  );
}
