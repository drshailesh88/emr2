"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MessageSquare, Star, Bug, Lightbulb, Loader2, CheckCircle } from "lucide-react";

interface FeedbackWidgetProps {
  doctorId: Id<"doctors">;
  currentPage?: string;
}

const CATEGORIES = [
  { value: "bug", label: "Bug Report", icon: Bug },
  { value: "feature", label: "Feature Request", icon: Lightbulb },
  { value: "usability", label: "Usability Issue", icon: MessageSquare },
  { value: "other", label: "Other Feedback", icon: MessageSquare },
];

export function FeedbackWidget({ doctorId, currentPage }: FeedbackWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<string>("");
  const [rating, setRating] = useState<number>(0);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const submitFeedback = useMutation(api.feedback.submit);

  const handleSubmit = async () => {
    if (!category || !message.trim()) return;

    setIsSubmitting(true);
    try {
      await submitFeedback({
        doctorId,
        category,
        rating: rating > 0 ? rating : undefined,
        message: message.trim(),
        page: currentPage,
        metadata: JSON.stringify({
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
          timestamp: new Date().toISOString(),
        }),
      });
      setIsSubmitted(true);
      setTimeout(() => {
        setIsOpen(false);
        setIsSubmitted(false);
        setCategory("");
        setRating(0);
        setMessage("");
      }, 2000);
    } catch (error) {
      console.error("Error submitting feedback:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-4 right-4 shadow-lg"
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Feedback
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {isSubmitted ? (
          <div className="flex flex-col items-center justify-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold">Thank You!</h3>
            <p className="text-gray-500 text-center mt-2">
              Your feedback helps us improve the system.
            </p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Send Feedback</DialogTitle>
              <DialogDescription>
                Help us improve by sharing your thoughts, reporting bugs, or
                requesting features.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {/* Category Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <div className="flex items-center gap-2">
                          <cat.icon className="h-4 w-4" />
                          {cat.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Star Rating */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Overall Experience (optional)
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`h-6 w-6 ${
                          star <= rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Your Feedback</label>
                <Textarea
                  placeholder="Tell us what's on your mind..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Submit Button */}
              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={!category || !message.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Feedback"
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// NPS Survey Component
interface NPSSurveyProps {
  doctorId: Id<"doctors">;
  onComplete?: () => void;
}

export function NPSSurvey({ doctorId, onComplete }: NPSSurveyProps) {
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const submitNPS = useMutation(api.feedback.submitNPS);

  const handleSubmit = async () => {
    if (score === null) return;

    setIsSubmitting(true);
    try {
      await submitNPS({
        doctorId,
        score,
        comment: comment.trim() || undefined,
      });
      setIsSubmitted(true);
      onComplete?.();
    } catch (error) {
      console.error("Error submitting NPS:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-3" />
        <h3 className="font-semibold text-green-800">Thank you for your feedback!</h3>
        <p className="text-green-600 text-sm mt-1">
          Your response helps us improve the service.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-lg p-6">
      <h3 className="font-semibold text-lg mb-2">
        How likely are you to recommend us to a colleague?
      </h3>
      <p className="text-gray-500 text-sm mb-4">
        On a scale of 0-10, where 0 is "Not at all likely" and 10 is "Extremely
        likely"
      </p>

      {/* Score Buttons */}
      <div className="flex justify-between mb-4">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setScore(n)}
            className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
              score === n
                ? n <= 6
                  ? "bg-red-500 text-white"
                  : n <= 8
                  ? "bg-yellow-500 text-white"
                  : "bg-green-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {n}
          </button>
        ))}
      </div>

      <div className="flex justify-between text-xs text-gray-400 mb-4">
        <span>Not likely</span>
        <span>Very likely</span>
      </div>

      {/* Comment */}
      {score !== null && (
        <div className="space-y-2 mb-4">
          <label className="text-sm font-medium">
            {score <= 6
              ? "What could we do better?"
              : score <= 8
              ? "What would make you rate us higher?"
              : "What do you like most about us?"}
          </label>
          <Textarea
            placeholder="Your thoughts (optional)..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
        </div>
      )}

      {/* Submit */}
      <Button
        className="w-full"
        onClick={handleSubmit}
        disabled={score === null || isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Submitting...
          </>
        ) : (
          "Submit"
        )}
      </Button>
    </div>
  );
}
