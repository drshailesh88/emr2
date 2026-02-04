import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

// Trigger OCR processing for pending documents
// POST /process-documents?limit=5
http.route({
  path: "/process-documents",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Get limit from query params
    const url = new URL(request.url);
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : 5;

    try {
      const result = await ctx.runAction(api.ocrService.processPendingDocuments, {
        limit,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

// Get processing stats
// GET /processing-stats?doctorId=xxx
http.route({
  path: "/processing-stats",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const doctorId = url.searchParams.get("doctorId");

    if (!doctorId) {
      return new Response(JSON.stringify({ error: "doctorId required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const stats = await ctx.runQuery(api.documentIngestion.getProcessingStats, {
        doctorId: doctorId as any,
      });

      return new Response(JSON.stringify(stats), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

export default http;
