import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// OCR result type
interface OcrResult {
  extractedText: string;
  summary: string;
  category: string;
  structuredData?: {
    type: string;
    data: Record<string, unknown>;
  };
}

// Process a single document with Claude Vision
export const processDocument = action({
  args: {
    documentId: v.id("documents"),
  },
  handler: async (ctx, args): Promise<OcrResult | null> => {
    // Get the document
    const document = await ctx.runQuery(api.documents.getById, {
      documentId: args.documentId,
    });

    if (!document || !document.url) {
      console.error("Document not found or has no URL");
      return null;
    }

    // Mark as processing
    await ctx.runMutation(api.documentIngestion.markProcessing, {
      documentId: args.documentId,
    });

    try {
      // Only process images and PDFs
      if (document.fileType !== "image" && document.fileType !== "pdf") {
        // Mark as completed without OCR
        await ctx.runMutation(api.documentIngestion.completeProcessing, {
          documentId: args.documentId,
          extractedText: "",
          summary: "Non-text document",
          category: document.category || "other",
        });
        return {
          extractedText: "",
          summary: "Non-text document",
          category: document.category || "other",
        };
      }

      // Get the API key from environment
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error("ANTHROPIC_API_KEY not configured");
      }

      // Fetch the image/document
      const response = await fetch(document.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");

      // Determine media type
      const mediaType = document.mimeType || (document.fileType === "pdf" ? "application/pdf" : "image/jpeg");

      // Call Claude Vision API
      const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: mediaType,
                    data: base64,
                  },
                },
                {
                  type: "text",
                  text: `You are an expert medical document analyzer for an Indian cardiology practice.

Analyze this medical document image and extract ALL text content. Then provide:

1. EXTRACTED_TEXT: Complete text extraction from the document (preserve formatting where possible)

2. SUMMARY: A 2-3 sentence summary of what this document contains and key findings

3. CATEGORY: Classify into ONE of these categories:
   - lab_report (blood tests, urine tests, lipid profile, etc.)
   - prescription (medication prescriptions)
   - discharge_summary (hospital discharge papers)
   - ecg (ECG/EKG readings)
   - echo_report (echocardiogram reports)
   - angiography (angiography/angiogram reports)
   - imaging (X-ray, CT, MRI reports)
   - medical_certificate (fitness certificates, medical letters)
   - insurance_form (insurance claim forms)
   - other (anything else)

4. STRUCTURED_DATA: If applicable, extract key medical values in JSON format:
   - For lab reports: test names and values with units
   - For prescriptions: medication names, dosages, frequencies
   - For ECG: rate, rhythm, intervals, findings
   - For echo: EF%, chamber sizes, valve findings

Respond in this exact format:
---EXTRACTED_TEXT---
[full text here]
---SUMMARY---
[summary here]
---CATEGORY---
[category here]
---STRUCTURED_DATA---
[JSON or "none" if not applicable]`,
                },
              ],
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

      const parsed = parseOcrResponse(responseText);

      // Save the results
      await ctx.runMutation(api.documentIngestion.completeProcessing, {
        documentId: args.documentId,
        extractedText: parsed.extractedText,
        summary: parsed.summary,
        category: parsed.category,
      });

      return parsed;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("OCR processing failed:", errorMessage);

      // Mark as failed
      await ctx.runMutation(api.documentIngestion.markFailed, {
        documentId: args.documentId,
        error: errorMessage,
      });

      return null;
    }
  },
});

// Parse Claude's structured response
function parseOcrResponse(response: string): OcrResult {
  const sections = {
    extractedText: "",
    summary: "",
    category: "other",
    structuredData: undefined as OcrResult["structuredData"],
  };

  // Extract sections using markers
  const textMatch = response.match(/---EXTRACTED_TEXT---\s*([\s\S]*?)(?=---SUMMARY---|$)/);
  const summaryMatch = response.match(/---SUMMARY---\s*([\s\S]*?)(?=---CATEGORY---|$)/);
  const categoryMatch = response.match(/---CATEGORY---\s*([\s\S]*?)(?=---STRUCTURED_DATA---|$)/);
  const dataMatch = response.match(/---STRUCTURED_DATA---\s*([\s\S]*?)$/);

  if (textMatch) {
    sections.extractedText = textMatch[1].trim();
  }

  if (summaryMatch) {
    sections.summary = summaryMatch[1].trim();
  }

  if (categoryMatch) {
    const category = categoryMatch[1].trim().toLowerCase();
    // Validate category
    const validCategories = [
      "lab_report", "prescription", "discharge_summary", "ecg",
      "echo_report", "angiography", "imaging", "medical_certificate",
      "insurance_form", "other"
    ];
    sections.category = validCategories.includes(category) ? category : "other";
  }

  if (dataMatch) {
    const dataText = dataMatch[1].trim();
    if (dataText && dataText.toLowerCase() !== "none") {
      try {
        // Try to extract JSON from the response
        const jsonMatch = dataText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          sections.structuredData = {
            type: sections.category,
            data: parsed,
          };
        }
      } catch {
        // JSON parsing failed, ignore structured data
      }
    }
  }

  return sections;
}

// Process all pending documents (batch processing)
export const processPendingDocuments = action({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 5;

    // Get pending documents
    const pendingDocs = await ctx.runQuery(api.documentIngestion.getPendingDocuments, {
      limit,
    });

    const results: Array<{
      documentId: Id<"documents">;
      success: boolean;
      error?: string;
    }> = [];

    // Process each document
    for (const doc of pendingDocs) {
      try {
        const result = await ctx.runAction(api.ocrService.processDocument, {
          documentId: doc._id,
        });
        results.push({
          documentId: doc._id,
          success: result !== null,
        });
      } catch (error) {
        results.push({
          documentId: doc._id,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return {
      processed: results.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  },
});

// Simple text extraction for non-vision cases (e.g., already text documents)
export const extractTextOnly = action({
  args: {
    documentId: v.id("documents"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the API key from environment
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    // Use Claude to summarize and categorize extracted text
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
            content: `Analyze this medical document text and provide:

1. A 2-3 sentence SUMMARY of the key findings
2. CATEGORY: one of: lab_report, prescription, discharge_summary, ecg, echo_report, angiography, imaging, medical_certificate, insurance_form, other

Document text:
${args.text.substring(0, 4000)}

Respond in format:
SUMMARY: [your summary]
CATEGORY: [category]`,
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
    const summaryMatch = responseText.match(/SUMMARY:\s*([\s\S]*?)(?=CATEGORY:|$)/);
    const categoryMatch = responseText.match(/CATEGORY:\s*(\w+)/);

    const summary = summaryMatch ? summaryMatch[1].trim() : "Medical document";
    const category = categoryMatch ? categoryMatch[1].trim().toLowerCase() : "other";

    // Update the document
    await ctx.runMutation(api.documentIngestion.completeProcessing, {
      documentId: args.documentId,
      extractedText: args.text,
      summary,
      category,
    });

    return { summary, category };
  },
});
