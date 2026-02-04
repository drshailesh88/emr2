"use client";

import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { LogOut } from "lucide-react";
import { PatientQueuePanel } from "@/components/emr/PatientQueuePanel";
import { PrescriptionEditorPanel } from "@/components/emr/PrescriptionEditorPanel";
import { AIAssistantPanel } from "@/components/emr/AIAssistantPanel";

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
        <AIAssistantPanel
          doctor={doctor ?? null}
          selectedPatient={selectedPatient ?? null}
        />
      </div>
    </div>
  );
}
