import { ShimmerButton } from "@/components/ui/shimmer-button"

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 .5C5.73.5.67 5.56.67 11.83c0 5.02 3.24 9.27 7.74 10.77.57.1.78-.25.78-.55 0-.27-.01-.99-.02-1.94-3.15.68-3.81-1.52-3.81-1.52-.51-1.3-1.26-1.65-1.26-1.65-1.03-.7.08-.69.08-.69 1.14.08 1.74 1.17 1.74 1.17 1.01 1.74 2.66 1.24 3.31.95.1-.73.4-1.24.72-1.52-2.51-.29-5.15-1.26-5.15-5.6 0-1.24.44-2.25 1.17-3.05-.12-.29-.51-1.45.11-3.02 0 0 .96-.31 3.14 1.17.91-.25 1.89-.38 2.86-.39.97 0 1.95.14 2.86.39 2.18-1.48 3.14-1.17 3.14-1.17.62 1.57.23 2.73.11 3.02.73.8 1.17 1.81 1.17 3.05 0 4.35-2.65 5.31-5.17 5.59.41.35.77 1.04.77 2.1 0 1.52-.01 2.75-.01 3.12 0 .3.2.66.79.55 4.5-1.5 7.73-5.75 7.73-10.77C23.33 5.56 18.27.5 12 .5z"
      />
    </svg>
  )
}

export function OpenSource() {
  return (
    <section className="w-full px-4 py-20">
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Proudly Open-Sourced
        </h2>
        <p className="mt-4 text-base text-muted-foreground sm:text-lg">
          Our source code is available on GitHub. Feel free to review or contribute.
        </p>
        <a
          href="https://github.com/sayeedjoy/linkarena"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8"
        >
          <ShimmerButton className="gap-2">
            <GithubIcon className="h-4 w-4" />
            <span className="text-sm font-medium">View on GitHub</span>
          </ShimmerButton>
        </a>
      </div>
    </section>
  )
}
