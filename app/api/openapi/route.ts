import { NextResponse } from "next/server";

const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "LinkArena API",
    version: "1.0.0",
    description: "REST API for LinkArena web, mobile, and extension clients.",
  },
  servers: [{ url: "/" }],
  tags: [
    { name: "Mobile Auth" },
    { name: "Bookmarks" },
    { name: "Sync" },
    { name: "Realtime" },
    { name: "Public Mobile" },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "Token",
      },
    },
  },
  paths: {
    "/api/mobile/auth/login": {
      post: {
        tags: ["Mobile Auth"],
        summary: "Login and receive a bearer token",
        responses: {
          "200": { description: "Authenticated" },
          "401": { description: "Invalid credentials" },
        },
      },
    },
    "/api/mobile/auth/signup": {
      post: {
        tags: ["Mobile Auth"],
        summary: "Register and receive a bearer token",
        responses: {
          "201": { description: "Created" },
          "403": { description: "Signup disabled" },
          "409": { description: "Already exists" },
        },
      },
    },
    "/api/bookmarks": {
      post: {
        tags: ["Bookmarks"],
        summary: "Create bookmark",
        security: [{ BearerAuth: [] }],
        responses: {
          "201": { description: "Created" },
          "429": { description: "Quota exceeded" },
        },
      },
      put: {
        tags: ["Bookmarks"],
        summary: "Update bookmark by URL",
        security: [{ BearerAuth: [] }],
        responses: {
          "200": { description: "Updated" },
          "404": { description: "Not found" },
        },
      },
      delete: {
        tags: ["Bookmarks"],
        summary: "Delete bookmark by URL",
        security: [{ BearerAuth: [] }],
        responses: {
          "204": { description: "Deleted" },
          "404": { description: "Not found" },
        },
      },
    },
    "/api/sync": {
      get: {
        tags: ["Sync"],
        summary: "Sync bookmarks and groups",
        security: [{ BearerAuth: [] }],
        responses: {
          "200": { description: "Synced" },
          "429": { description: "Quota exceeded" },
        },
      },
    },
    "/api/realtime/bookmarks": {
      get: {
        tags: ["Realtime"],
        summary: "SSE stream for bookmark updates",
        security: [{ BearerAuth: [] }],
        responses: {
          "200": { description: "SSE stream opened" },
        },
      },
    },
    "/api/mobile/ads": {
      get: {
        tags: ["Public Mobile"],
        summary: "Get mobile ads configuration",
        responses: {
          "200": { description: "Ads config" },
        },
      },
    },
  },
} as const;

export async function GET() {
  return NextResponse.json(openApiDocument);
}
