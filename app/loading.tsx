export default function Loading() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="size-12 animate-spin rounded-full border-4 border-muted border-t-primary" />
        <p className="text-muted-foreground font-sans text-sm">Loading...</p>
      </div>
    </div>
  );
}
