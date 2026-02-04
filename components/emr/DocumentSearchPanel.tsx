"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Search,
  X,
} from "lucide-react";

interface DocumentSearchPanelProps {
  doctorId: Id<"doctors"> | null;
}

// Document type with patient name
interface SearchDocument {
  _id: Id<"documents">;
  patientId: Id<"patients">;
  fileName: string;
  fileType: string;
  category?: string;
  processingStatus?: string;
  extractedText?: string;
  summary?: string;
  uploadedAt: number;
  url?: string | null;
  patientName?: string;
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

const categoryOptions = [
  { value: "all", label: "All Categories" },
  { value: "lab_report", label: "Lab Reports" },
  { value: "prescription", label: "Prescriptions" },
  { value: "discharge_summary", label: "Discharge Summaries" },
  { value: "ecg", label: "ECG" },
  { value: "echo_report", label: "Echo Reports" },
  { value: "angiography", label: "Angiography" },
  { value: "imaging", label: "Imaging" },
  { value: "medical_certificate", label: "Certificates" },
  { value: "insurance_form", label: "Insurance" },
  { value: "whatsapp_media", label: "WhatsApp Media" },
];

export function DocumentSearchPanel({ doctorId }: DocumentSearchPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDocument, setSelectedDocument] = useState<SearchDocument | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Search documents
  const searchResults = useQuery(
    api.documents.searchDocuments,
    doctorId && searchQuery.length >= 2
      ? {
          doctorId,
          query: searchQuery,
          category: selectedCategory !== "all" ? selectedCategory : undefined,
        }
      : "skip"
  ) as SearchDocument[] | undefined;

  // Recent documents when no search
  const recentDocuments = useQuery(
    api.documents.getRecentDocuments,
    doctorId && searchQuery.length < 2 ? { doctorId, limit: 20 } : "skip"
  ) as SearchDocument[] | undefined;

  // Retry mutation
  const retryProcessing = useMutation(api.documentIngestion.retryProcessing);

  // Determine which documents to show
  const displayDocuments = searchQuery.length >= 2 ? searchResults : recentDocuments;

  // Highlight matching text
  const highlightText = (text: string, query: string) => {
    if (!query || query.length < 2) return text;
    const regex = new RegExp(`(${query})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  if (!doctorId) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-muted/20">
        <div className="text-center text-muted-foreground">
          <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Sign in to search documents</p>
        </div>
      </div>
    );
  }

  const handleViewDocument = (doc: SearchDocument) => {
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
    <div className="flex-1 flex flex-col bg-background" data-testid="document-search-panel">
      {/* Search Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents by content, patient name, filename..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8"
              data-testid="document-search-input"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {searchQuery.length >= 2 && searchResults && (
            <span className="text-sm text-muted-foreground">
              {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Search Results / Recent Documents */}
      <ScrollArea className="flex-1 p-4">
        {displayDocuments === undefined ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : displayDocuments.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
            {searchQuery.length >= 2 ? (
              <p>No documents found matching &quot;{searchQuery}&quot;</p>
            ) : (
              <>
                <p>No recent documents</p>
                <p className="text-sm">Documents sent via WhatsApp will appear here</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {!searchQuery && (
              <p className="text-sm text-muted-foreground mb-2">Recent documents</p>
            )}
            {displayDocuments.map((doc) => {
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
                      <div className="w-14 h-14 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0">
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
                            {highlightText(doc.fileName, searchQuery)}
                          </span>
                          {getStatusIcon(doc.processingStatus)}
                        </div>

                        {/* Patient name */}
                        {doc.patientName && (
                          <p className="text-xs text-muted-foreground mb-1">
                            Patient: {highlightText(doc.patientName, searchQuery)}
                          </p>
                        )}

                        <div className="flex items-center gap-2 mb-1">
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
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {highlightText(doc.summary, searchQuery)}
                          </p>
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
              {selectedDocument?.patientName && (
                <span className="text-sm font-normal text-muted-foreground">
                  - {selectedDocument.patientName}
                </span>
              )}
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
