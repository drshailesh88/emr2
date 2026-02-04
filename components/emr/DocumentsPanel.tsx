"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  FileText,
  Image,
  FileAudio,
  FileVideo,
  Eye,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Upload,
  Sparkles,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
} from "lucide-react";

interface DocumentsPanelProps {
  patientId: Id<"patients"> | null;
  doctorId: Id<"doctors"> | null;
}

// Document type for the query result
interface Document {
  _id: Id<"documents">;
  fileName: string;
  fileType: string;
  category?: string;
  processingStatus?: string;
  extractedText?: string;
  summary?: string;
  uploadedAt: number;
  url?: string | null;
}

// Category display names and colors
const categoryConfig: Record<string, { label: string; color: string }> = {
  lab_report: { label: "Lab Report", color: "bg-blue-500" },
  prescription: { label: "Prescription", color: "bg-green-500" },
  discharge_summary: { label: "Discharge", color: "bg-purple-500" },
  ecg: { label: "ECG", color: "bg-red-500" },
  echo_report: { label: "Echo", color: "bg-pink-500" },
  angiography: { label: "Angiography", color: "bg-orange-500" },
  imaging: { label: "Imaging", color: "bg-cyan-500" },
  medical_certificate: { label: "Certificate", color: "bg-yellow-500" },
  insurance_form: { label: "Insurance", color: "bg-gray-500" },
  whatsapp_media: { label: "WhatsApp", color: "bg-emerald-500" },
  other: { label: "Other", color: "bg-slate-500" },
};

// Summary result type
interface PatientSummary {
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
}

export function DocumentsPanel({ patientId, doctorId }: DocumentsPanelProps) {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [patientSummary, setPatientSummary] = useState<PatientSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Fetch documents for the patient
  const documents = useQuery(
    api.documents.getByPatient,
    patientId ? { patientId } : "skip"
  ) as Document[] | undefined;

  // Retry mutation
  const retryProcessing = useMutation(api.documentIngestion.retryProcessing);

  // Generate summary action
  const generateSummary = useAction(api.documentSummary.generatePatientSummary);

  // Handle generating patient summary
  const handleGenerateSummary = async () => {
    if (!patientId) return;

    setSummaryLoading(true);
    setSummaryError(null);

    try {
      const result = await generateSummary({ patientId });
      setPatientSummary(result);
      setSummaryOpen(true);
    } catch (error) {
      setSummaryError(error instanceof Error ? error.message : "Failed to generate summary");
    } finally {
      setSummaryLoading(false);
    }
  };

  if (!patientId) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-muted/20">
        <div className="text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Select a patient to view documents</p>
        </div>
      </div>
    );
  }

  const handleViewDocument = (doc: Document) => {
    setSelectedDocument(doc);
    setPreviewOpen(true);
  };

  const handleRetryOcr = async (documentId: Id<"documents">) => {
    try {
      await retryProcessing({ documentId });
    } catch (error) {
      console.error("Failed to retry OCR:", error);
    }
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case "image":
        return <Image className="h-4 w-4" />;
      case "pdf":
        return <FileText className="h-4 w-4" />;
      case "audio":
        return <FileAudio className="h-4 w-4" />;
      case "video":
        return <FileVideo className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-3 w-3 text-yellow-500" />;
      case "processing":
        return <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />;
      case "completed":
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case "failed":
        return <XCircle className="h-3 w-3 text-red-500" />;
      default:
        return null;
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-background" data-testid="documents-panel">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="font-semibold">Patient Documents</h2>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerateSummary}
            disabled={summaryLoading || !documents || documents.length === 0}
          >
            {summaryLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            AI Summary
          </Button>
          <Button size="sm" variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
        </div>
      </div>

      {/* Summary Section (collapsible) */}
      {patientSummary && (
        <Collapsible open={summaryOpen} onOpenChange={setSummaryOpen}>
          <div className="border-b">
            <CollapsibleTrigger asChild>
              <div className="p-3 flex items-center justify-between cursor-pointer hover:bg-muted/50">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  <span className="font-medium text-sm">AI Summary</span>
                  <Badge variant="secondary" className="text-xs">
                    {patientSummary.documentCount} docs
                  </Badge>
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${summaryOpen ? "rotate-180" : ""}`} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4 space-y-4 bg-muted/30">
                {/* Overview */}
                <div>
                  <h4 className="text-sm font-medium mb-1">Overview</h4>
                  <p className="text-sm text-muted-foreground">{patientSummary.summary}</p>
                </div>

                {/* Key Findings */}
                {patientSummary.keyFindings.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Key Findings</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {patientSummary.keyFindings.slice(0, 5).map((finding, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <AlertCircle className="h-3 w-3 mt-0.5 text-blue-500 shrink-0" />
                          {finding}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                {patientSummary.recommendations.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Recommendations</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {patientSummary.recommendations.slice(0, 3).map((rec, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <TrendingUp className="h-3 w-3 mt-0.5 text-green-500 shrink-0" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Timeline (compact) */}
                {patientSummary.timeline.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Recent History</h4>
                    <div className="space-y-2">
                      {patientSummary.timeline.slice(0, 4).map((event, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <span className="text-muted-foreground w-16 shrink-0">{event.date}</span>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {event.category}
                          </Badge>
                          <span className="text-muted-foreground">{event.keyFindings}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      )}

      {/* Error message */}
      {summaryError && (
        <div className="p-3 bg-red-50 border-b text-red-600 text-sm">
          {summaryError}
        </div>
      )}

      {/* Document List */}
      <ScrollArea className="flex-1 p-4">
        {documents === undefined ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No documents yet</p>
            <p className="text-sm">Documents sent via WhatsApp will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => {
              const category = categoryConfig[doc.category || "other"] || categoryConfig.other;
              return (
                <Card
                  key={doc._id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleViewDocument(doc)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      {/* Thumbnail */}
                      <div className="w-16 h-16 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0">
                        {doc.fileType === "image" && doc.url ? (
                          <img
                            src={doc.url}
                            alt={doc.fileName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          getFileIcon(doc.fileType)
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm truncate">
                            {doc.fileName}
                          </span>
                          {getStatusIcon(doc.processingStatus)}
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <Badge
                            variant="secondary"
                            className={`text-xs text-white ${category.color}`}
                          >
                            {category.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(doc.uploadedAt)}
                          </span>
                        </div>

                        {doc.summary && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {doc.summary}
                          </p>
                        )}

                        {doc.processingStatus === "failed" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="mt-1 h-6 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRetryOcr(doc._id);
                            }}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Retry OCR
                          </Button>
                        )}
                      </div>

                      {/* View Button */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDocument(doc);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Document Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedDocument && getFileIcon(selectedDocument.fileType)}
              {selectedDocument?.fileName}
            </DialogTitle>
          </DialogHeader>

          {selectedDocument && (
            <div className="flex-1 overflow-hidden flex gap-4">
              {/* Document Preview */}
              <div className="flex-1 bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                {selectedDocument.fileType === "image" && selectedDocument.url ? (
                  <img
                    src={selectedDocument.url}
                    alt={selectedDocument.fileName}
                    className="max-w-full max-h-[60vh] object-contain"
                  />
                ) : selectedDocument.fileType === "pdf" && selectedDocument.url ? (
                  <iframe
                    src={selectedDocument.url}
                    className="w-full h-[60vh]"
                    title={selectedDocument.fileName}
                  />
                ) : (
                  <div className="text-center text-muted-foreground p-8">
                    <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p>Preview not available for this file type</p>
                    {selectedDocument.url && (
                      <Button asChild className="mt-4" variant="outline">
                        <a href={selectedDocument.url} target="_blank" rel="noopener noreferrer">
                          Download File
                        </a>
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Extracted Text */}
              <div className="w-80 flex flex-col border-l pl-4">
                <div className="mb-4">
                  <h4 className="font-medium text-sm mb-1">Category</h4>
                  <Badge
                    variant="secondary"
                    className={`text-white ${
                      categoryConfig[selectedDocument.category || "other"]?.color ||
                      categoryConfig.other.color
                    }`}
                  >
                    {categoryConfig[selectedDocument.category || "other"]?.label ||
                      categoryConfig.other.label}
                  </Badge>
                </div>

                {selectedDocument.summary && (
                  <div className="mb-4">
                    <h4 className="font-medium text-sm mb-1">Summary</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedDocument.summary}
                    </p>
                  </div>
                )}

                {selectedDocument.extractedText && (
                  <div className="flex-1 overflow-hidden">
                    <h4 className="font-medium text-sm mb-1">Extracted Text</h4>
                    <ScrollArea className="h-[40vh] border rounded p-2">
                      <pre className="text-xs whitespace-pre-wrap font-mono">
                        {selectedDocument.extractedText}
                      </pre>
                    </ScrollArea>
                  </div>
                )}

                {selectedDocument.processingStatus === "pending" && (
                  <div className="text-center text-muted-foreground py-4">
                    <Clock className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
                    <p className="text-sm">OCR processing pending</p>
                  </div>
                )}

                {selectedDocument.processingStatus === "processing" && (
                  <div className="text-center text-muted-foreground py-4">
                    <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin text-blue-500" />
                    <p className="text-sm">Processing document...</p>
                  </div>
                )}

                {selectedDocument.processingStatus === "failed" && (
                  <div className="text-center py-4">
                    <XCircle className="h-6 w-6 mx-auto mb-2 text-red-500" />
                    <p className="text-sm text-muted-foreground mb-2">
                      OCR processing failed
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRetryOcr(selectedDocument._id)}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Retry
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
