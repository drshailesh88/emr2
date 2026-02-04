"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { LogOut, Search, Send, User, Calendar, MessageSquare } from "lucide-react";

export default function DashboardPage() {
  const { signOut } = useAuthActions();
  const router = useRouter();
  const user = useQuery(api.users.current);
  const doctor = useQuery(api.users.currentDoctor);

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
        <aside className="w-64 border-r bg-card flex flex-col" data-testid="patient-queue-panel">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-sm mb-3">Patient Queue</h2>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search patients..."
                className="pl-8 h-9"
                data-testid="patient-search"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              <div className="text-xs font-medium text-muted-foreground mb-2">
                <Calendar className="inline h-3 w-3 mr-1" />
                Today
              </div>

              {/* Placeholder patient items */}
              <PatientQueueItem
                name="No patients yet"
                time="--:--"
                reason="Add patients to see them here"
                isPlaceholder
              />
            </div>

            <Separator className="my-2" />

            <div className="p-4 space-y-2">
              <div className="text-xs font-medium text-muted-foreground mb-2">
                Pending Requests
              </div>
              <p className="text-xs text-muted-foreground">No pending requests</p>
            </div>
          </ScrollArea>
        </aside>

        {/* Middle Panel - Prescription Editor */}
        <main className="flex-1 flex flex-col overflow-hidden" data-testid="prescription-panel">
          <ScrollArea className="flex-1 p-6">
            <div className="max-w-3xl mx-auto">
              {doctor ? (
                <Card>
                  <CardHeader className="pb-4">
                    <div className="text-center border-b pb-4">
                      <h2 className="text-lg font-bold uppercase">{doctor.name}</h2>
                      <p className="text-sm text-muted-foreground">{doctor.qualifications}</p>
                      <p className="text-sm font-medium">{doctor.specialty}</p>
                      <p className="text-sm text-muted-foreground mt-1">{doctor.clinicName}</p>
                      <p className="text-xs text-muted-foreground">{doctor.clinicAddress}</p>
                      <p className="text-xs text-muted-foreground">Reg. No: {doctor.registrationNumber}</p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Date</p>
                        <p>{new Date().toLocaleDateString("en-IN")}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Patient</p>
                        <p className="text-muted-foreground italic">Select a patient</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Age / Sex</p>
                        <p className="text-muted-foreground italic">--</p>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Chief Complaints</p>
                      <p className="text-sm text-muted-foreground italic">Select a patient to start prescription</p>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Diagnosis</p>
                      <p className="text-sm text-muted-foreground italic">--</p>
                    </div>

                    <Separator />

                    <div>
                      <p className="text-lg font-serif mb-2">℞</p>
                      <p className="text-sm text-muted-foreground italic">
                        No medications added. Use the AI Assistant to draft a prescription.
                      </p>
                    </div>

                    <Separator />

                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Investigations Advised</p>
                      <p className="text-sm text-muted-foreground italic">--</p>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Follow-up</p>
                      <p className="text-sm text-muted-foreground italic">--</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Welcome!</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Your account is being set up. If you just signed up, please
                      refresh the page.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 mt-4 justify-end">
                <Button variant="outline" size="sm" disabled>
                  Print
                </Button>
                <Button variant="outline" size="sm" disabled>
                  PDF
                </Button>
                <Button size="sm" disabled>
                  Send
                </Button>
              </div>
            </div>
          </ScrollArea>
        </main>

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
                <p>Hello Dr. {doctor?.name || ""}! I&apos;m your AI secretary. Select a patient from the queue, and I&apos;ll help you draft prescriptions, review their history, and more.</p>
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
              <Button variant="outline" size="sm" className="flex-1 text-xs" disabled>
                Send WhatsApp
              </Button>
              <Button variant="outline" size="sm" className="flex-1 text-xs" disabled>
                Send Email
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// Patient Queue Item Component
function PatientQueueItem({
  name,
  time,
  reason,
  isActive = false,
  isPlaceholder = false
}: {
  name: string;
  time: string;
  reason: string;
  isActive?: boolean;
  isPlaceholder?: boolean;
}) {
  return (
    <div
      className={`p-3 rounded-lg cursor-pointer transition-colors ${
        isActive
          ? "bg-primary/10 border border-primary"
          : isPlaceholder
            ? "bg-muted/50 border border-dashed border-muted-foreground/30"
            : "hover:bg-muted"
      }`}
      data-testid="patient-queue-item"
    >
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          isPlaceholder ? "bg-muted" : "bg-primary/10"
        }`}>
          <User className={`h-4 w-4 ${isPlaceholder ? "text-muted-foreground" : "text-primary"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${isPlaceholder ? "text-muted-foreground" : ""}`}>
            {name}
          </p>
          <p className="text-xs text-muted-foreground truncate">{reason}</p>
        </div>
        <span className={`text-xs ${isPlaceholder ? "text-muted-foreground" : ""}`}>{time}</span>
      </div>
    </div>
  );
}
