"use client";

import { useState, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "linkarena-first-visit";
const STAIR_COUNT = 7;
const WORDS = ["Bookmarking", "like", "never", "before"];

// Timing constants (ms)
const TEXT_START = 200;
const TEXT_STAGGER = 140;
const HOLD_DURATION = 1900;
const EXIT_STAGGER = 0.07;
const EXIT_DURATION = 0.55;

export function Preloader({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [showPreloader, setShowPreloader] = useState(false);
  const [phase, setPhase] = useState<"enter" | "exit" | "done">("enter");

  useEffect(() => {
    setMounted(true);

    try {
      const hasVisited = localStorage.getItem(STORAGE_KEY);
      if (hasVisited) {
        setShowPreloader(false);
        setPhase("done");
        return;
      }
    } catch {
      // localStorage unavailable (SSR, private browsing edge cases)
      setShowPreloader(false);
      setPhase("done");
      return;
    }

    setShowPreloader(true);

    // Lock scroll while preloader is active
    document.body.style.overflow = "hidden";

    // Calculate when text animation finishes, then hold, then exit
    const textDuration = TEXT_START + WORDS.length * TEXT_STAGGER + 400;
    const exitTimer = setTimeout(() => {
      setPhase("exit");
    }, textDuration + HOLD_DURATION);

    return () => clearTimeout(exitTimer);
  }, []);

  // When exit animation completes, clean up
  useEffect(() => {
    if (phase === "exit") {
      const totalExitTime =
        (STAIR_COUNT * EXIT_STAGGER + EXIT_DURATION) * 1000 + 100;
      const cleanup = setTimeout(() => {
        setShowPreloader(false);
        setPhase("done");
        document.body.style.overflow = "";
        try {
          localStorage.setItem(STORAGE_KEY, "true");
        } catch {
          // silent
        }
      }, totalExitTime);
      return () => clearTimeout(cleanup);
    }
  }, [phase]);

  // Before mount, render nothing (prevents hydration flash)
  if (!mounted) {
    return <>{children}</>;
  }

  // If done, just render children
  if (phase === "done" && !showPreloader) {
    return <>{children}</>;
  }

  return (
    <>
      <AnimatePresence mode="wait">
        {showPreloader && (
          <motion.div
            key="preloader"
            className="fixed inset-0 z-[100] pointer-events-auto"
            aria-hidden="true"
          >
            {/* Stair Panels */}
            {Array.from({ length: STAIR_COUNT }).map((_, i) => {
              const panelHeight = 100 / STAIR_COUNT;
              const isEven = i % 2 === 0;

              return (
                <motion.div
                  key={`stair-${i}`}
                  className="absolute w-full bg-foreground"
                  style={{
                    top: `${i * panelHeight}%`,
                    height: `calc(${panelHeight}% + 1px)`, // +1px prevents subpixel gaps
                  }}
                  initial={{
                    x: isEven ? "-100%" : "100%",
                  }}
                  animate={{
                    x: "0%",
                    transition: {
                      duration: 0.5,
                      delay: i * 0.06,
                      ease: [0.76, 0, 0.24, 1], // custom cubic bezier
                    },
                  }}
                  exit={{
                    x: isEven ? "-105%" : "105%",
                    transition: {
                      duration: EXIT_DURATION,
                      delay: i * EXIT_STAGGER,
                      ease: [0.76, 0, 0.24, 1],
                    },
                  }}
                />
              );
            })}

            {/* Horizontal accent lines between stairs */}
            {Array.from({ length: STAIR_COUNT - 1 }).map((_, i) => {
              const panelHeight = 100 / STAIR_COUNT;
              return (
                <motion.div
                  key={`line-${i}`}
                  className="absolute left-0 w-full h-px bg-background/10"
                  style={{ top: `${(i + 1) * panelHeight}%` }}
                  initial={{ scaleX: 0 }}
                  animate={{
                    scaleX: 1,
                    transition: {
                      duration: 0.8,
                      delay: 0.3 + i * 0.04,
                      ease: [0.76, 0, 0.24, 1],
                    },
                  }}
                  exit={{
                    opacity: 0,
                    transition: { duration: 0.15 },
                  }}
                />
              );
            })}

            {/* Centered text content */}
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <div className="flex flex-wrap items-center justify-center gap-x-[0.3em] px-6">
                {WORDS.map((word, i) => (
                  <motion.span
                    key={word}
                    className={cn(
                      "text-background font-medium tracking-tight inline-block",
                      "text-[clamp(1.75rem,5vw,3.75rem)]"
                    )}
                    initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      filter: "blur(0px)",
                      transition: {
                        duration: 0.5,
                        delay: TEXT_START / 1000 + i * (TEXT_STAGGER / 1000),
                        ease: [0.22, 1, 0.36, 1],
                      },
                    }}
                    exit={{
                      opacity: 0,
                      y: -20,
                      filter: "blur(4px)",
                      transition: {
                        duration: 0.25,
                        delay: i * 0.04,
                        ease: [0.76, 0, 0.24, 1],
                      },
                    }}
                  >
                    {word}
                  </motion.span>
                ))}
              </div>
            </div>

            {/* Small decorative corner markers */}
            <CornerMark position="top-left" />
            <CornerMark position="top-right" />
            <CornerMark position="bottom-left" />
            <CornerMark position="bottom-right" />

            {/* Bottom progress indicator */}
            <motion.div
              className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
                transition: { delay: 0.8, duration: 0.4 },
              }}
              exit={{
                opacity: 0,
                transition: { duration: 0.15 },
              }}
            >
              <div className="flex items-center gap-1.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <motion.div
                    key={`dot-${i}`}
                    className="size-1 rounded-full bg-background/40"
                    animate={{
                      backgroundColor: [
                        "var(--background-dot-dim)",
                        "var(--background-dot-bright)",
                        "var(--background-dot-dim)",
                      ],
                    }}
                    style={{
                      // Use inline custom properties for the dot animation
                      // since Tailwind oklch vars don't interpolate cleanly in keyframes
                      "--background-dot-dim": "rgba(255,255,255,0.25)",
                      "--background-dot-bright": "rgba(255,255,255,0.8)",
                    } as React.CSSProperties}
                    transition={{
                      duration: 1.2,
                      delay: i * 0.2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Homepage content - always in DOM for SEO, hidden during preloader */}
      <motion.div
        initial={showPreloader ? { opacity: 0 } : { opacity: 1 }}
        animate={
          phase === "done"
            ? {
                opacity: 1,
                transition: { duration: 0.4, ease: "easeOut" },
              }
            : phase === "exit"
              ? {
                  opacity: 1,
                  transition: {
                    duration: 0.6,
                    delay: STAIR_COUNT * EXIT_STAGGER * 0.5,
                    ease: "easeOut",
                  },
                }
              : { opacity: 0 }
        }
      >
        {children}
      </motion.div>
    </>
  );
}

/** Small decorative corner crosses */
function CornerMark({
  position,
}: {
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}) {
  const positionClasses = {
    "top-left": "top-6 left-6",
    "top-right": "top-6 right-6",
    "bottom-left": "bottom-6 left-6",
    "bottom-right": "bottom-6 right-6",
  };

  return (
    <motion.div
      className={cn(
        "absolute z-10 size-3",
        positionClasses[position]
      )}
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: 1,
        scale: 1,
        transition: { delay: 0.6, duration: 0.3, ease: "easeOut" },
      }}
      exit={{
        opacity: 0,
        scale: 0,
        transition: { duration: 0.15 },
      }}
    >
      {/* Horizontal line */}
      <div className="absolute top-1/2 left-0 w-full h-px bg-background/30 -translate-y-1/2" />
      {/* Vertical line */}
      <div className="absolute top-0 left-1/2 w-px h-full bg-background/30 -translate-x-1/2" />
    </motion.div>
  );
}
