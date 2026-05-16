import Image from "next/image"

export function GetProduct() {
  return (
    <section className="w-full px-4 py-12">
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Get the Extension & App
        </h2>
        <p className="mt-4 text-base text-muted-foreground sm:text-lg">
          Install the Chrome extension and Android app to keep your links in sync.
        </p>
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
          <a
            href="https://chromewebstore.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block transition-opacity hover:opacity-90"
          >
            <Image
              src="/chrome.png"
              alt="Available in the Chrome Web Store"
              width={180}
              height={56}
              className="h-14 w-auto"
            />
          </a>
          <a
            href="https://play.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block transition-opacity hover:opacity-90"
          >
            <Image
              src="/playstore.png"
              alt="Get it on Google Play"
              width={180}
              height={56}
              className="h-14 w-auto"
            />
          </a>
        </div>
      </div>
    </section>
  )
}
