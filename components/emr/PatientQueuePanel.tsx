"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Calendar, User, Clock } from "lucide-react";

interface PatientQueuePanelProps {
  selectedPatientId: Id<"patients"> | null;
  onSelectPatient: (patientId: Id<"patients"> | null) => void;
}

export function PatientQueuePanel({
  selectedPatientId,
  onSelectPatient,
}: PatientQueuePanelProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // Queries
  const todayAppointments = useQuery(api.appointments.today) ?? [];
  const pendingRequests = useQuery(api.appointments.pending) ?? [];
  const searchResults = useQuery(
    api.patients.search,
    searchTerm.length >= 2 ? { searchTerm } : "skip"
  );

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div
      className="flex flex-col flex-1"
      data-testid="patient-queue-panel"
    >
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search patients..."
            className="pl-8 h-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="patient-search"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {/* Search Results */}
        {searchTerm.length >= 2 && (
          <>
            <div className="p-4 space-y-2">
              <div className="text-xs font-medium text-muted-foreground mb-2">
                <Search className="inline h-3 w-3 mr-1" />
                Search Results
              </div>
              {searchResults === undefined ? (
                <p className="text-xs text-muted-foreground">Searching...</p>
              ) : searchResults.length === 0 ? (
                <p className="text-xs text-muted-foreground">No patients found</p>
              ) : (
                searchResults.map((patient) => (
                  <PatientQueueItem
                    key={patient._id}
                    name={patient.name}
                    subtitle={patient.phone}
                    isActive={selectedPatientId === patient._id}
                    onClick={() => onSelectPatient(patient._id)}
                  />
                ))
              )}
            </div>
            <Separator className="my-2" />
          </>
        )}

        {/* Today's Appointments */}
        <div className="p-4 space-y-2">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            <Calendar className="inline h-3 w-3 mr-1" />
            Today
          </div>

          {todayAppointments.length === 0 ? (
            <PlaceholderItem />
          ) : (
            todayAppointments.map((apt) => (
              <PatientQueueItem
                key={apt._id}
                name={apt.patient?.name ?? "Unknown"}
                time={formatTime(apt.dateTime)}
                subtitle={apt.reason || "Consultation"}
                status={apt.status}
                isActive={selectedPatientId === apt.patientId}
                onClick={() => onSelectPatient(apt.patientId)}
              />
            ))
          )}
        </div>

        <Separator className="my-2" />

        {/* Pending Requests */}
        <div className="p-4 space-y-2">
          <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center justify-between">
            <span>
              <Clock className="inline h-3 w-3 mr-1" />
              Pending Requests
            </span>
            {pendingRequests.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {pendingRequests.length}
              </Badge>
            )}
          </div>

          {pendingRequests.length === 0 ? (
            <p className="text-xs text-muted-foreground">No pending requests</p>
          ) : (
            pendingRequests.map((apt) => (
              <PatientQueueItem
                key={apt._id}
                name={apt.patient?.name ?? "Unknown"}
                time={formatTime(apt.dateTime)}
                subtitle={apt.reason || "Appointment request"}
                status="requested"
                isActive={selectedPatientId === apt.patientId}
                onClick={() => onSelectPatient(apt.patientId)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// Patient Queue Item Component
function PatientQueueItem({
  name,
  time,
  subtitle,
  status,
  isActive = false,
  onClick,
}: {
  name: string;
  time?: string;
  subtitle?: string;
  status?: string;
  isActive?: boolean;
  onClick?: () => void;
}) {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-500";
      case "requested":
        return "bg-yellow-500";
      case "completed":
        return "bg-gray-400";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-primary";
    }
  };

  return (
    <div
      className={`p-3 rounded-lg cursor-pointer transition-colors ${
        isActive
          ? "bg-primary/10 border border-primary"
          : "hover:bg-muted"
      }`}
      onClick={onClick}
      data-testid="patient-queue-item"
    >
      <div className="flex items-center gap-2">
        <div className="relative">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-4 w-4 text-primary" />
          </div>
          {status && (
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${getStatusColor(status)}`}
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{name}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
        {time && <span className="text-xs text-muted-foreground">{time}</span>}
      </div>
    </div>
  );
}

// Placeholder for empty state
function PlaceholderItem() {
  return (
    <div
      className="p-3 rounded-lg bg-muted/50 border border-dashed border-muted-foreground/30"
      data-testid="patient-queue-placeholder"
    >
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground">No appointments</p>
          <p className="text-xs text-muted-foreground">Schedule patients to see them here</p>
        </div>
      </div>
    </div>
  );
}
