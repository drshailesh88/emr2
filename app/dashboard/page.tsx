"use client";

import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { LogOut, Users, MessageSquare, FileText, ClipboardList, Search } from "lucide-react";
import { PatientQueuePanel } from "@/components/emr/PatientQueuePanel";
import { PrescriptionEditorPanel } from "@/components/emr/PrescriptionEditorPanel";
import { AIAssistantPanel } from "@/components/emr/AIAssistantPanel";
import { ApprovalQueuePanel } from "@/components/emr/ApprovalQueuePanel";
import { DocumentsPanel } from "@/components/emr/DocumentsPanel";
import { DocumentSearchPanel } from "@/components/emr/DocumentSearchPanel";

export default function DashboardPage() {
  const { signOut } = useAuthActions();
  const router = useRouter();
  const user = useQuery(api.users.current);
  const doctor = useQuery(api.users.currentDoctor);

  // Selected patient state
  const [selectedPatientId, setSelectedPatientId] = useState<Id<"patients"> | null>(null);

  // Left panel tab state
  const [leftPanelTab, setLeftPanelTab] = useState<"patients" | "approvals">("patients");

  // Middle panel tab state
  const [middlePanelTab, setMiddlePanelTab] = useState<"prescription" | "documents" | "search">("prescription");

  // Get pending approvals count
  const pendingApprovals = useQuery(
    api.messageIntake.getPendingApprovalMessages,
    doctor ? { doctorId: doctor._id } : "skip"
  );
  const pendingCount = pendingApprovals?.length ?? 0;

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
        {/* Left Panel - Patient Queue / Approval Queue */}
        <div className="w-80 border-r bg-card flex flex-col">
          {/* Tab Switcher */}
          <div className="p-2 border-b">
            <Tabs value={leftPanelTab} onValueChange={(v) => setLeftPanelTab(v as "patients" | "approvals")}>
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="patients" className="text-xs" data-testid="patients-tab">
                  <Users className="h-3 w-3 mr-1" />
                  Patients
                </TabsTrigger>
                <TabsTrigger value="approvals" className="text-xs relative" data-testid="approvals-tab">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Approvals
                  {pendingCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="ml-1 h-4 w-4 p-0 text-[10px] flex items-center justify-center"
                    >
                      {pendingCount}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Tab Content */}
          {leftPanelTab === "patients" ? (
            <PatientQueuePanel
              selectedPatientId={selectedPatientId}
              onSelectPatient={setSelectedPatientId}
            />
          ) : (
            <ApprovalQueuePanel doctorId={doctor?._id ?? null} />
          )}
        </div>

        {/* Middle Panel - Prescription Editor / Documents */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Middle Panel Tabs */}
          <div className="p-2 border-b bg-card">
            <Tabs value={middlePanelTab} onValueChange={(v) => setMiddlePanelTab(v as "prescription" | "documents" | "search")}>
              <TabsList className="grid grid-cols-3 w-80">
                <TabsTrigger value="prescription" className="text-xs" data-testid="prescription-tab">
                  <ClipboardList className="h-3 w-3 mr-1" />
                  Prescription
                </TabsTrigger>
                <TabsTrigger value="documents" className="text-xs" data-testid="documents-tab">
                  <FileText className="h-3 w-3 mr-1" />
                  Documents
                </TabsTrigger>
                <TabsTrigger value="search" className="text-xs" data-testid="search-tab">
                  <Search className="h-3 w-3 mr-1" />
                  Search
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Middle Panel Content */}
          {middlePanelTab === "prescription" ? (
            <PrescriptionEditorPanel
              doctor={doctor ?? null}
              selectedPatient={selectedPatient ?? null}
            />
          ) : middlePanelTab === "documents" ? (
            <DocumentsPanel
              patientId={selectedPatientId}
              doctorId={doctor?._id ?? null}
            />
          ) : (
            <DocumentSearchPanel
              doctorId={doctor?._id ?? null}
            />
          )}
        </div>

        {/* Right Panel - AI Assistant */}
        <AIAssistantPanel
          doctor={doctor ?? null}
          selectedPatient={selectedPatient ?? null}
        />
      </div>
    </div>
  );
}
