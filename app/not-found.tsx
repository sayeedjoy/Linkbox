import Link from "next/link";
import { SITE_TITLE } from "@/lib/metadata";
import { Button } from "@/components/ui/button";
import { HomeIcon } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center flex flex-col items-center gap-4">
        <p className="text-6xl font-semibold text-muted-foreground">404</p>
        <h1 className="text-lg font-medium text-foreground">Page not found</h1>
        <p className="text-sm text-muted-foreground">
          The page you’re looking for doesn’t exist or has been moved.
        </p>
        <Button asChild>
          <Link href="/" className="gap-2">
            <HomeIcon className="size-4" />
            Back to {SITE_TITLE}
          </Link>
        </Button>
      </div>
    </div>
  );
}
