import Link from "next/link";

export default function Page() {
  return (
    <main className="min-h-dvh bg-background">
      <section className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Linkbox
        </p>
        <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          Save and organize your web bookmarks
        </h1>
        <p className="mt-4 max-w-xl text-pretty text-base text-muted-foreground sm:text-lg">
          The app has moved to your dashboard. Use the links below to sign in,
          create an account, or open your workspace.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
          >
            Open dashboard
          </Link>
          <Link
            href="/sign-in"
            className="rounded-md border border-border px-4 py-2 text-sm font-medium"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-md border border-border px-4 py-2 text-sm font-medium"
          >
            Sign up
          </Link>
        </div>
      </section>
    </main>
  );
}
