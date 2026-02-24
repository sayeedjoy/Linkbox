import { useRef, useEffect } from "react";

export function useForwardedRef<T>(forwardedRef: React.Ref<T> | undefined) {
  const innerRef = useRef<T>(null);
  useEffect(() => {
    if (!forwardedRef) return;
    if (typeof forwardedRef === "function") {
      forwardedRef(innerRef.current);
    } else {
      (forwardedRef as React.MutableRefObject<T | null>).current = innerRef.current;
    }
  });
  return innerRef;
}
