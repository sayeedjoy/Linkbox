import type { Metadata } from "next";
import { connection } from "next/server";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SwaggerDocs } from "./swagger-docs";

export const metadata: Metadata = { title: "API Reference" };

export default async function AdminApiDocsPage() {
  await connection();

  return (
    <div className="flex flex-col">
      <AdminPageHeader
        title="API Reference"
        description="Interactive OpenAPI documentation"
      />
      <div className="p-4 sm:p-6">
        <SwaggerDocs />
      </div>
    </div>
  );
}
