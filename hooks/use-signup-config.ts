"use client";

import { useEffect, useState } from "react";

export function useSignupConfig(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let active = true;

    fetch("/api/config/signup")
      .then(async (r) => {
        if (!r.ok) {
          throw new Error("Failed to load signup config");
        }
        return r.json() as Promise<{ enabled?: boolean }>;
      })
      .then((data) => {
        if (active) {
          setEnabled(data.enabled === true);
        }
      })
      .catch(() => {
        if (active) {
          setEnabled(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return enabled;
}
