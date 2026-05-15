"use client";

import { useEffect, useRef } from "react";
import "swagger-ui-dist/swagger-ui.css";

export function SwaggerDocs() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isMounted = true;

    const mountSwagger = async () => {
      const swaggerBundleModule = await import("swagger-ui-dist/swagger-ui-bundle.js");
      const standalonePresetModule = await import("swagger-ui-dist/swagger-ui-standalone-preset.js");

      const SwaggerUIBundle =
        (swaggerBundleModule as { default?: unknown }).default ?? swaggerBundleModule;
      const SwaggerUIStandalonePreset =
        (standalonePresetModule as { default?: unknown }).default ?? standalonePresetModule;

      if (!isMounted || !containerRef.current) return;

      (SwaggerUIBundle as (config: Record<string, unknown>) => unknown)({
        domNode: containerRef.current,
        url: "/api/openapi",
        docExpansion: "list",
        defaultModelsExpandDepth: 1,
        persistAuthorization: true,
        presets: [
          (SwaggerUIBundle as { presets?: { apis?: unknown } }).presets?.apis,
          SwaggerUIStandalonePreset,
        ].filter(Boolean),
      });
    };

    void mountSwagger();

    return () => {
      isMounted = false;
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, []);

  return (
    <div className="overflow-hidden rounded-lg border bg-background">
      <div ref={containerRef} />
    </div>
  );
}
