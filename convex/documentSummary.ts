import { v } from "convex/values";
import { action, query } from "./_generated/server";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Generate a comprehensive summary of all documents for a patient
export const generatePatientSummary = action({
  args: {
    patientId: v.id("patients"),
  },
  handler: async (ctx, args): Promise<{
    summary: string;
    timeline: Array<{
      date: string;
      category: string;
      title: string;
      keyFindings: string;
    }>;
    keyFindings: string[];
    recommendations: string[];
    documentCount: number;
  } | null> => {
    // Get all completed documents for this patient
    const documents = await ctx.runQuery(api.documents.getByPatient, {
      patientId: args.patientId,
    });

    // Filter to only processed documents with extracted text
    const processedDocs = documents.filter(
      (doc: { processingStatus?: string; extractedText?: string }) =>
        doc.processingStatus === "completed" && doc.extractedText
    );

    if (processedDocs.length === 0) {
      return null;
    }

    // Get the API key from environment
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    // Prepare document summaries for context
    const documentContext = processedDocs
      .map((doc: {
        fileName: string;
        category?: string;
        uploadedAt: number;
        summary?: string;
        extractedText?: string;
      }) => {
        const date = new Date(doc.uploadedAt).toLocaleDateString("en-IN");
        return `
---
Document: ${doc.fileName}
Category: ${doc.category || "Unknown"}
Date: ${date}
Summary: ${doc.summary || "No summary"}
Key Content: ${(doc.extractedText || "").substring(0, 1000)}
---`;
      })
      .join("\n");

    // Call Claude to generate comprehensive summary
    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: `You are an expert medical assistant for a cardiology practice in India. Analyze these patient documents and provide a comprehensive summary.

${documentContext}

Please provide:

1. COMPREHENSIVE_SUMMARY: A 3-5 sentence overview of the patient's medical history based on these documents.

2. TIMELINE: A chronological list of significant medical events from the documents. For each event include:
   - Date
   - Category (lab_report, prescription, ecg, etc.)
   - Title (brief description)
   - Key findings (most important points)

3. KEY_FINDINGS: A bullet list of the most important medical findings across all documents (lab abnormalities, diagnoses, significant test results).

4. RECOMMENDATIONS: Based on the documents, list any follow-up actions or concerns that should be addressed (missing tests, trends to monitor, etc.).

Respond in this exact format:
---COMPREHENSIVE_SUMMARY---
[your summary here]

---TIMELINE---
[date] | [category] | [title] | [key findings]
[date] | [category] | [title] | [key findings]
...

---KEY_FINDINGS---
- [finding 1]
- [finding 2]
...

---RECOMMENDATIONS---
- [recommendation 1]
- [recommendation 2]
...`,
          },
        ],
      }),
    });

    if (!claudeResponse.ok) {
      const error = await claudeResponse.text();
      throw new Error(`Claude API error: ${claudeResponse.status} - ${error}`);
    }

    const claudeResult = await claudeResponse.json() as {
      content: Array<{ type: string; text?: string }>;
    };

    // Parse Claude's response
    const responseText = claudeResult.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    // Extract sections
    const summaryMatch = responseText.match(/---COMPREHENSIVE_SUMMARY---\s*([\s\S]*?)(?=---TIMELINE---|$)/);
    const timelineMatch = responseText.match(/---TIMELINE---\s*([\s\S]*?)(?=---KEY_FINDINGS---|$)/);
    const findingsMatch = responseText.match(/---KEY_FINDINGS---\s*([\s\S]*?)(?=---RECOMMENDATIONS---|$)/);
    const recommendationsMatch = responseText.match(/---RECOMMENDATIONS---\s*([\s\S]*?)$/);

    const summary = summaryMatch ? summaryMatch[1].trim() : "Unable to generate summary";

    // Parse timeline
    const timeline: Array<{
      date: string;
      category: string;
      title: string;
      keyFindings: string;
    }> = [];

    if (timelineMatch) {
      const timelineLines = timelineMatch[1].trim().split("\n").filter(line => line.includes("|"));
      for (const line of timelineLines) {
        const parts = line.split("|").map(p => p.trim());
        if (parts.length >= 4) {
          timeline.push({
            date: parts[0],
            category: parts[1],
            title: parts[2],
            keyFindings: parts[3],
          });
        }
      }
    }

    // Parse key findings
    const keyFindings: string[] = [];
    if (findingsMatch) {
      const findingsLines = findingsMatch[1].trim().split("\n");
      for (const line of findingsLines) {
        const finding = line.replace(/^-\s*/, "").trim();
        if (finding) {
          keyFindings.push(finding);
        }
      }
    }

    // Parse recommendations
    const recommendations: string[] = [];
    if (recommendationsMatch) {
      const recommendationsLines = recommendationsMatch[1].trim().split("\n");
      for (const line of recommendationsLines) {
        const recommendation = line.replace(/^-\s*/, "").trim();
        if (recommendation) {
          recommendations.push(recommendation);
        }
      }
    }

    return {
      summary,
      timeline,
      keyFindings,
      recommendations,
      documentCount: processedDocs.length,
    };
  },
});

// Generate a comparison between two documents (e.g., two lab reports)
export const compareDocuments = action({
  args: {
    documentId1: v.id("documents"),
    documentId2: v.id("documents"),
  },
  handler: async (ctx, args): Promise<{
    comparison: string;
    changes: Array<{
      metric: string;
      oldValue: string;
      newValue: string;
      trend: "improved" | "worsened" | "stable" | "unknown";
    }>;
    summary: string;
  } | null> => {
    // Get both documents
    const doc1 = await ctx.runQuery(api.documents.getById, {
      documentId: args.documentId1,
    });
    const doc2 = await ctx.runQuery(api.documents.getById, {
      documentId: args.documentId2,
    });

    if (!doc1 || !doc2 || !doc1.extractedText || !doc2.extractedText) {
      return null;
    }

    // Get the API key from environment
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const date1 = new Date(doc1.uploadedAt).toLocaleDateString("en-IN");
    const date2 = new Date(doc2.uploadedAt).toLocaleDateString("en-IN");

    // Call Claude to compare documents
    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `Compare these two medical documents and identify changes:

DOCUMENT 1 (${date1} - ${doc1.category}):
${doc1.extractedText.substring(0, 2000)}

DOCUMENT 2 (${date2} - ${doc2.category}):
${doc2.extractedText.substring(0, 2000)}

Please provide:

1. COMPARISON: A brief narrative comparison of the two documents.

2. CHANGES: For each measurable value that appears in both documents, list:
   metric | old_value | new_value | trend (improved/worsened/stable/unknown)

3. SUMMARY: A one-sentence summary of the overall trend.

Format:
---COMPARISON---
[comparison text]

---CHANGES---
[metric] | [old] | [new] | [trend]
...

---SUMMARY---
[summary]`,
          },
        ],
      }),
    });

    if (!claudeResponse.ok) {
      throw new Error(`Claude API error: ${claudeResponse.status}`);
    }

    const claudeResult = await claudeResponse.json() as {
      content: Array<{ type: string; text?: string }>;
    };

    const responseText = claudeResult.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    // Parse response
    const comparisonMatch = responseText.match(/---COMPARISON---\s*([\s\S]*?)(?=---CHANGES---|$)/);
    const changesMatch = responseText.match(/---CHANGES---\s*([\s\S]*?)(?=---SUMMARY---|$)/);
    const summaryMatch = responseText.match(/---SUMMARY---\s*([\s\S]*?)$/);

    const comparison = comparisonMatch ? comparisonMatch[1].trim() : "";
    const summary = summaryMatch ? summaryMatch[1].trim() : "";

    const changes: Array<{
      metric: string;
      oldValue: string;
      newValue: string;
      trend: "improved" | "worsened" | "stable" | "unknown";
    }> = [];

    if (changesMatch) {
      const changeLines = changesMatch[1].trim().split("\n").filter(line => line.includes("|"));
      for (const line of changeLines) {
        const parts = line.split("|").map(p => p.trim());
        if (parts.length >= 4) {
          const trendStr = parts[3].toLowerCase();
          let trend: "improved" | "worsened" | "stable" | "unknown" = "unknown";
          if (trendStr.includes("improved")) trend = "improved";
          else if (trendStr.includes("worsened")) trend = "worsened";
          else if (trendStr.includes("stable")) trend = "stable";

          changes.push({
            metric: parts[0],
            oldValue: parts[1],
            newValue: parts[2],
            trend,
          });
        }
      }
    }

    return {
      comparison,
      changes,
      summary,
    };
  },
});

// Get summary statistics for a patient's documents
export const getPatientDocumentStats = query({
  args: {
    patientId: v.id("patients"),
  },
  handler: async (ctx, args) => {
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .collect();

    // Calculate statistics
    const stats = {
      total: documents.length,
      byCategory: {} as Record<string, number>,
      byStatus: {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
      },
      dateRange: {
        oldest: null as number | null,
        newest: null as number | null,
      },
    };

    for (const doc of documents) {
      // Count by category
      const category = doc.category || "other";
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;

      // Count by status
      const status = doc.processingStatus || "completed";
      if (status in stats.byStatus) {
        stats.byStatus[status as keyof typeof stats.byStatus]++;
      }

      // Track date range
      if (stats.dateRange.oldest === null || doc.uploadedAt < stats.dateRange.oldest) {
        stats.dateRange.oldest = doc.uploadedAt;
      }
      if (stats.dateRange.newest === null || doc.uploadedAt > stats.dateRange.newest) {
        stats.dateRange.newest = doc.uploadedAt;
      }
    }

    return stats;
  },
});
