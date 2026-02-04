"use client";

import { useState, useRef, useEffect } from "react";
import { Doc } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Send, MessageSquare, Bot, User, AlertTriangle, Loader2 } from "lucide-react";

interface Message {
  id: string;
  role: "secretary" | "doctor";
  content: string;
  timestamp: Date;
}

interface AIAssistantPanelProps {
  doctor: Doc<"doctors"> | null;
  selectedPatient: Doc<"patients"> | null;
}

export function AIAssistantPanel({
  doctor,
  selectedPatient,
}: AIAssistantPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Generate welcome message when patient changes
  useEffect(() => {
    const welcomeMessage = generateWelcomeMessage(doctor, selectedPatient);
    setMessages([
      {
        id: "welcome",
        role: "secretary",
        content: welcomeMessage,
        timestamp: new Date(),
      },
    ]);
  }, [doctor, selectedPatient?._id]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "doctor",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Simulate AI response (placeholder)
    setTimeout(() => {
      const aiResponse: Message = {
        id: `ai-${Date.now()}`,
        role: "secretary",
        content: generatePlaceholderResponse(userMessage.content, selectedPatient),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <aside
      className="w-80 border-l bg-card flex flex-col"
      data-testid="ai-assistant-panel"
    >
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          AI Assistant
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Chat with your secretary
        </p>
      </div>

      {/* Patient Context Banner */}
      {selectedPatient && (
        <div className="px-4 py-2 bg-primary/5 border-b text-xs">
          <span className="font-medium">Patient:</span> {selectedPatient.name}
          {selectedPatient.allergies && selectedPatient.allergies.length > 0 && (
            <span className="ml-2 text-red-600">
              <AlertTriangle className="h-3 w-3 inline mr-1" />
              Allergies: {selectedPatient.allergies.join(", ")}
            </span>
          )}
        </div>
      )}

      {/* Chat Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Thinking...
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t space-y-2">
        <div className="flex gap-2">
          <Input
            placeholder={selectedPatient ? "Ask the secretary..." : "Select a patient first"}
            className="flex-1 h-9"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!selectedPatient || isLoading}
            data-testid="ai-input"
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!selectedPatient || !input.trim() || isLoading}
            data-testid="ai-send-btn"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            disabled={!selectedPatient}
          >
            Send WhatsApp
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            disabled={!selectedPatient}
          >
            Send Email
          </Button>
        </div>
      </div>
    </aside>
  );
}

// Chat Bubble Component
function ChatBubble({ message }: { message: Message }) {
  const isSecretary = message.role === "secretary";

  return (
    <div
      className={`flex gap-2 ${isSecretary ? "" : "flex-row-reverse"}`}
      data-testid="chat-message"
    >
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
          isSecretary ? "bg-primary/10" : "bg-muted"
        }`}
      >
        {isSecretary ? (
          <Bot className="h-4 w-4 text-primary" />
        ) : (
          <User className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <div
        className={`max-w-[85%] rounded-lg p-3 text-sm ${
          isSecretary
            ? "bg-muted"
            : "bg-primary text-primary-foreground"
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        <p
          className={`text-xs mt-1 ${
            isSecretary ? "text-muted-foreground" : "text-primary-foreground/70"
          }`}
        >
          {message.timestamp.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}

// Generate welcome message based on context
function generateWelcomeMessage(
  doctor: Doc<"doctors"> | null,
  patient: Doc<"patients"> | null
): string {
  if (!doctor) {
    return "Welcome! Please complete your profile setup to start using the AI assistant.";
  }

  if (!patient) {
    return `Hello Dr. ${doctor.name}! I'm your AI secretary. Select a patient from the queue, and I'll help you draft prescriptions, review their history, and more.`;
  }

  let message = `Patient **${patient.name}** selected.`;

  if (patient.age) {
    message += ` Age: ${patient.age}.`;
  }

  if (patient.allergies && patient.allergies.length > 0) {
    message += `\n\n⚠️ **Known allergies:** ${patient.allergies.join(", ")}`;
  }

  if (patient.comorbidities && patient.comorbidities.length > 0) {
    message += `\n\n**Comorbidities:** ${patient.comorbidities.join(", ")}`;
  }

  if (patient.currentMedications && patient.currentMedications.length > 0) {
    message += `\n\n**Current medications:** ${patient.currentMedications.join(", ")}`;
  }

  message += "\n\nHow can I help you with this patient today?";

  return message;
}

// Generate placeholder response (will be replaced with actual AI)
function generatePlaceholderResponse(
  userInput: string,
  patient: Doc<"patients"> | null
): string {
  const input = userInput.toLowerCase();

  // Simple keyword-based responses for demonstration
  if (input.includes("prescribe") || input.includes("medicine") || input.includes("medication")) {
    return `I understand you'd like to prescribe medication${patient ? ` for ${patient.name}` : ""}. AI-powered prescription drafting will be available soon!\n\nFor now, please use the Prescription Editor panel to manually add medications. I'll be able to suggest dosages and check for interactions once fully integrated.`;
  }

  if (input.includes("history") || input.includes("previous") || input.includes("past")) {
    return `I'll look up the patient's history for you.\n\n📋 **Feature coming soon:** I'll be able to summarize previous visits, prescriptions, and uploaded documents.\n\nFor now, this feature is in development.`;
  }

  if (input.includes("hello") || input.includes("hi")) {
    return `Hello, Doctor! I'm here to help. You can ask me to:\n\n• Draft prescriptions\n• Review patient history\n• Summarize documents\n• Schedule follow-ups\n\nWhat would you like to do?`;
  }

  if (input.includes("follow") || input.includes("appointment") || input.includes("schedule")) {
    return `I can help schedule a follow-up${patient ? ` for ${patient.name}` : ""}.\n\n📅 **Coming soon:** I'll be able to check your availability and send appointment confirmations via WhatsApp.\n\nFor now, please enter the follow-up date in the Prescription Editor.`;
  }

  return `I received your message: "${userInput}"\n\n🚧 **AI Integration Coming Soon**\n\nI'll be fully powered by Claude Sonnet to help you:\n• Draft prescriptions based on symptoms\n• Check drug interactions\n• Suggest investigations\n• Generate patient summaries\n\nStay tuned!`;
}
