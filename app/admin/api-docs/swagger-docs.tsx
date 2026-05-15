"use client";

import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

export function SwaggerDocs() {
  return (
    <div className="overflow-hidden rounded-lg border bg-background">
      <SwaggerUI
        url="/api/openapi"
        docExpansion="list"
        defaultModelsExpandDepth={1}
        persistAuthorization
      />
    </div>
  );
}
