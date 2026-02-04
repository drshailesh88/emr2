"use client";

import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { LogOut, Send, MessageSquare } from "lucide-react";
import { PatientQueuePanel } from "@/components/emr/PatientQueuePanel";
import { PrescriptionEditorPanel } from "@/components/emr/PrescriptionEditorPanel";

export default function DashboardPage() {
  const { signOut } = useAuthActions();
  const router = useRouter();
  const user = useQuery(api.users.current);
  const doctor = useQuery(api.users.currentDoctor);

  // Selected patient state
  const [selectedPatientId, setSelectedPatientId] = useState<Id<"patients"> | null>(null);

  // Get selected patient details
  const selectedPatient = useQuery(
    api.patients.get,
    selectedPatientId ? { id: selectedPatientId } : "skip"
  );

  // Redirect to login if not authenticated
  useEffect(() => {
    if (user === null) {
      router.push("/login");
    }
  }, [user, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  // Loading state
  if (user === undefined) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </main>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b bg-card" data-testid="emr-header">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">Doctor Secretary AI</h1>
          {doctor && (
            <span className="text-sm text-muted-foreground">
              {doctor.clinicName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {doctor && (
            <span className="text-sm font-medium">Dr. {doctor.name}</span>
          )}
          <Button variant="ghost" size="sm" onClick={handleSignOut} data-testid="logout-btn">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main 3-Panel Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Patient Queue */}
        <PatientQueuePanel
          selectedPatientId={selectedPatientId}
          onSelectPatient={setSelectedPatientId}
        />

        {/* Middle Panel - Prescription Editor */}
        <PrescriptionEditorPanel
          doctor={doctor ?? null}
          selectedPatient={selectedPatient ?? null}
        />

        {/* Right Panel - AI Assistant */}
        <aside className="w-80 border-l bg-card flex flex-col" data-testid="ai-assistant-panel">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              AI Assistant
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Chat with your secretary
            </p>
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-3 text-sm">
                <p className="font-medium text-xs text-muted-foreground mb-1">Secretary</p>
                {selectedPatient ? (
                  <p>
                    Patient <strong>{selectedPatient.name}</strong> selected.
                    {selectedPatient.age && ` Age: ${selectedPatient.age}.`}
                    {selectedPatient.allergies && selectedPatient.allergies.length > 0 && (
                      <span className="text-red-600"> Known allergies: {selectedPatient.allergies.join(", ")}.</span>
                    )}
                    {selectedPatient.comorbidities && selectedPatient.comorbidities.length > 0 && (
                      <span> Comorbidities: {selectedPatient.comorbidities.join(", ")}.</span>
                    )}
                    <br /><br />
                    How can I help you with this patient?
                  </p>
                ) : (
                  <p>
                    Hello Dr. {doctor?.name || ""}! I&apos;m your AI secretary.
                    Select a patient from the queue, and I&apos;ll help you draft
                    prescriptions, review their history, and more.
                  </p>
                )}
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Chat functionality coming soon...
              </p>
            </div>
          </ScrollArea>

          <div className="p-4 border-t space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Ask the secretary..."
                className="flex-1 h-9"
                disabled
                data-testid="ai-input"
              />
              <Button size="sm" disabled data-testid="ai-send-btn">
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 text-xs" disabled={!selectedPatient}>
                Send WhatsApp
              </Button>
              <Button variant="outline" size="sm" className="flex-1 text-xs" disabled={!selectedPatient}>
                Send Email
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
