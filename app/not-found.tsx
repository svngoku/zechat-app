import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 px-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-display text-6xl font-bold">404</h1>
        <h2 className="font-display text-2xl font-semibold">Page Not Found</h2>
        <p className="text-muted-foreground font-sans text-sm">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Return Home</Link>
      </Button>
    </div>
  );
}
