"use client";

import SwaggerUI from "swagger-ui-react";

export default function SwaggerPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-8">
      <h1 className="mb-4 text-2xl font-semibold text-foreground">API Docs</h1>
      <SwaggerUI url="/openapi.json" />
    </main>
  );
}
