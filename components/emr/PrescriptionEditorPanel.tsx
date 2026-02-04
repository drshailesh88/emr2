"use client";

import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id, Doc } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Loader2, Check, AlertTriangle, FileText, Download } from "lucide-react";
import {
  searchMedications,
  getMedication,
  checkDrugInteractions,
  frequencyOptions,
  prescriptionTemplates,
} from "@/lib/medications";

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

interface PrescriptionEditorPanelProps {
  doctor: Doc<"doctors"> | null;
  selectedPatient: Doc<"patients"> | null;
  onPrescriptionSaved?: (id: Id<"prescriptions">) => void;
}

export function PrescriptionEditorPanel({
  doctor,
  selectedPatient,
  onPrescriptionSaved,
}: PrescriptionEditorPanelProps) {
  // Form state
  const [chiefComplaints, setChiefComplaints] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [medications, setMedications] = useState<Medication[]>([]);
  const [investigations, setInvestigations] = useState<string[]>([]);
  const [newInvestigation, setNewInvestigation] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [followUp, setFollowUp] = useState("");

  // Medication autocomplete state
  const [medSuggestions, setMedSuggestions] = useState<{ name: string; commonDosages: string[] }[]>([]);
  const [activeMedIndex, setActiveMedIndex] = useState<number | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);

  // Drug interaction warnings
  const [drugWarnings, setDrugWarnings] = useState<string[]>([]);

  // Template selection
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Convex mutations
  const createPrescription = useMutation(api.prescriptions.create);
  const generateUploadUrl = useMutation(api.prescriptionPdf.generatePdfUploadUrl);
  const storePdfFileId = useMutation(api.prescriptionPdf.storePdfFileId);

  // Reset form when patient changes
  useEffect(() => {
    setChiefComplaints("");
    setDiagnosis("");
    setMedications([]);
    setInvestigations([]);
    setSpecialInstructions("");
    setFollowUp("");
    setSaveSuccess(false);
    setSelectedTemplate("");
    setDrugWarnings([]);
  }, [selectedPatient?._id]);

  // Check drug interactions when medications change
  useEffect(() => {
    if (medications.length > 1) {
      const medNames = medications.map((m) => m.name).filter((n) => n.trim());
      const warnings = checkDrugInteractions(medNames);
      setDrugWarnings(warnings);
    } else {
      setDrugWarnings([]);
    }
  }, [medications]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Apply template to form
  const applyTemplate = (templateId: string) => {
    const template = prescriptionTemplates.find((t) => t.id === templateId);
    if (!template) return;

    setDiagnosis(template.diagnosis);
    setMedications(template.medications.map((m) => ({ ...m })));
    setInvestigations(template.investigations);
    setSpecialInstructions(template.specialInstructions);
    setFollowUp(template.followUp);
    setSelectedTemplate(templateId);
  };

  // Handle medication name search
  const handleMedNameChange = (index: number, value: string) => {
    updateMedication(index, "name", value);
    if (value.length >= 2) {
      const suggestions = searchMedications(value);
      setMedSuggestions(suggestions);
      setActiveMedIndex(index);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  // Select medication from suggestions
  const selectMedication = (index: number, medName: string) => {
    const medInfo = getMedication(medName);
    updateMedication(index, "name", medName);
    if (medInfo && medInfo.commonDosages.length > 0) {
      updateMedication(index, "dosage", medInfo.commonDosages[0]);
    }
    setShowSuggestions(false);
  };

  // Add empty medication
  const addMedication = () => {
    setMedications([
      ...medications,
      { name: "", dosage: "", frequency: "", duration: "", instructions: "" },
    ]);
  };

  // Update medication at index
  const updateMedication = (index: number, field: keyof Medication, value: string) => {
    const updated = [...medications];
    updated[index] = { ...updated[index], [field]: value };
    setMedications(updated);
  };

  // Remove medication at index
  const removeMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  // Add investigation
  const addInvestigation = () => {
    if (newInvestigation.trim()) {
      setInvestigations([...investigations, newInvestigation.trim()]);
      setNewInvestigation("");
    }
  };

  // Remove investigation
  const removeInvestigation = (index: number) => {
    setInvestigations(investigations.filter((_, i) => i !== index));
  };

  // Save prescription
  const handleSave = async (): Promise<Id<"prescriptions"> | null> => {
    if (!selectedPatient) return null;

    // Validate medications have at least name
    const validMedications = medications.filter((m) => m.name.trim());

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const id = await createPrescription({
        patientId: selectedPatient._id,
        chiefComplaints: chiefComplaints || undefined,
        diagnosis: diagnosis || undefined,
        medications: validMedications,
        investigations: investigations.length > 0 ? investigations : undefined,
        specialInstructions: specialInstructions || undefined,
        followUp: followUp || undefined,
      });

      setSaveSuccess(true);
      onPrescriptionSaved?.(id);

      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
      return id;
    } catch (error) {
      console.error("Failed to save prescription:", error);
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  // Generate and download PDF
  const handleGeneratePdf = async () => {
    if (!selectedPatient || !doctor) return;

    setIsGeneratingPdf(true);
    try {
      // First save the prescription if it has content
      let prescriptionId: Id<"prescriptions"> | null = null;
      const validMedications = medications.filter((m) => m.name.trim());

      if (validMedications.length > 0) {
        prescriptionId = await handleSave();
      }

      // Import and render PDF
      const { renderPrescriptionPdfToBlob } = await import("@/lib/prescriptionPdf");

      const pdfBlob = await renderPrescriptionPdfToBlob({
        doctor: {
          name: doctor.name,
          qualifications: doctor.qualifications,
          specialty: doctor.specialty,
          clinicName: doctor.clinicName,
          clinicAddress: doctor.clinicAddress,
          registrationNumber: doctor.registrationNumber,
          phone: doctor.phone,
        },
        patient: {
          name: selectedPatient.name,
          age: selectedPatient.age,
          sex: selectedPatient.sex,
          phone: selectedPatient.phone,
        },
        date: new Date().toLocaleDateString("en-IN"),
        chiefComplaints: chiefComplaints || undefined,
        diagnosis: diagnosis || undefined,
        medications: validMedications,
        investigations: investigations.length > 0 ? investigations : undefined,
        specialInstructions: specialInstructions || undefined,
        followUp: followUp || undefined,
      });

      // If we have a prescription ID, upload and store the PDF
      if (prescriptionId) {
        const uploadUrl = await generateUploadUrl();
        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": "application/pdf" },
          body: pdfBlob,
        });

        if (uploadResponse.ok) {
          const { storageId } = await uploadResponse.json();
          await storePdfFileId({
            prescriptionId,
            fileId: storageId,
          });
        }
      }

      // Download the PDF
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `prescription-${selectedPatient.name.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (!doctor) {
    return (
      <main className="flex-1 flex flex-col overflow-hidden" data-testid="prescription-panel">
        <div className="flex-1 flex items-center justify-center">
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">
                Your account is being set up. Please refresh the page.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col overflow-hidden" data-testid="prescription-panel">
      <ScrollArea className="flex-1 p-6">
        <div className="max-w-3xl mx-auto">
          <Card>
            {/* Doctor Letterhead */}
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
              {/* Template Selector */}
              {selectedPatient && (
                <div className="flex items-center gap-2 mb-2">
                  <Label className="text-xs whitespace-nowrap">Quick Template:</Label>
                  <Select value={selectedTemplate} onValueChange={applyTemplate}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select a template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {prescriptionTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex items-center gap-2">
                            <FileText className="h-3 w-3" />
                            {template.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Drug Interaction Warnings */}
              {drugWarnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3" data-testid="drug-warnings">
                  <div className="flex items-center gap-2 text-yellow-800 font-medium text-sm mb-1">
                    <AlertTriangle className="h-4 w-4" />
                    Drug Interaction Warnings
                  </div>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {drugWarnings.map((warning, i) => (
                      <li key={i}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Patient Info Row */}
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Date</Label>
                  <p>{new Date().toLocaleDateString("en-IN")}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Patient</Label>
                  {selectedPatient ? (
                    <p className="font-medium">{selectedPatient.name}</p>
                  ) : (
                    <p className="text-muted-foreground italic">Select a patient</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Age / Sex</Label>
                  {selectedPatient ? (
                    <p>
                      {selectedPatient.age ?? "--"} / {selectedPatient.sex ?? "--"}
                    </p>
                  ) : (
                    <p className="text-muted-foreground italic">--</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Chief Complaints */}
              <div>
                <Label htmlFor="chief-complaints" className="text-xs font-medium">
                  Chief Complaints
                </Label>
                <Input
                  id="chief-complaints"
                  placeholder={selectedPatient ? "e.g., Fever for 3 days, headache" : "Select a patient first"}
                  value={chiefComplaints}
                  onChange={(e) => setChiefComplaints(e.target.value)}
                  disabled={!selectedPatient}
                  className="mt-1"
                  data-testid="chief-complaints-input"
                />
              </div>

              {/* Diagnosis */}
              <div>
                <Label htmlFor="diagnosis" className="text-xs font-medium">
                  Diagnosis
                </Label>
                <Input
                  id="diagnosis"
                  placeholder={selectedPatient ? "e.g., Viral fever" : "--"}
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  disabled={!selectedPatient}
                  className="mt-1"
                  data-testid="diagnosis-input"
                />
              </div>

              <Separator />

              {/* Medications */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-lg font-serif">℞</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addMedication}
                    disabled={!selectedPatient}
                    data-testid="add-medication-btn"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Medicine
                  </Button>
                </div>

                {medications.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    {selectedPatient
                      ? "Click 'Add Medicine' to add medications"
                      : "Select a patient to add medications"}
                  </p>
                ) : (
                  <div className="space-y-4">
                    {medications.map((med, index) => (
                      <div
                        key={index}
                        className="p-3 border rounded-lg space-y-2 bg-muted/30"
                        data-testid="medication-item"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Medicine {index + 1}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMedication(index)}
                            className="h-8 w-8 p-0 text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {/* Medicine name with autocomplete */}
                          <div className="relative" ref={activeMedIndex === index ? suggestionRef : undefined}>
                            <Input
                              placeholder="Medicine name"
                              value={med.name}
                              onChange={(e) => handleMedNameChange(index, e.target.value)}
                              onFocus={() => {
                                if (med.name.length >= 2) {
                                  const suggestions = searchMedications(med.name);
                                  setMedSuggestions(suggestions);
                                  setActiveMedIndex(index);
                                  setShowSuggestions(true);
                                }
                              }}
                              className="text-sm"
                              data-testid="medicine-name-input"
                            />
                            {showSuggestions && activeMedIndex === index && medSuggestions.length > 0 && (
                              <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                                {medSuggestions.map((suggestion) => (
                                  <button
                                    key={suggestion.name}
                                    type="button"
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex justify-between items-center"
                                    onClick={() => selectMedication(index, suggestion.name)}
                                  >
                                    <span>{suggestion.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {suggestion.commonDosages.join(", ")}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          <Input
                            placeholder="Dosage (e.g., 500mg)"
                            value={med.dosage}
                            onChange={(e) => updateMedication(index, "dosage", e.target.value)}
                            className="text-sm"
                          />

                          {/* Frequency dropdown */}
                          <Select
                            value={med.frequency}
                            onValueChange={(value) => updateMedication(index, "frequency", value)}
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder="Frequency" />
                            </SelectTrigger>
                            <SelectContent>
                              {frequencyOptions.map((freq) => (
                                <SelectItem key={freq.code} value={freq.code}>
                                  <span className="font-medium">{freq.code}</span>
                                  <span className="text-muted-foreground ml-2 text-xs">
                                    ({freq.english})
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Input
                            placeholder="Duration (e.g., 5 days)"
                            value={med.duration}
                            onChange={(e) => updateMedication(index, "duration", e.target.value)}
                            className="text-sm"
                          />
                        </div>
                        <Input
                          placeholder="Instructions (e.g., After food)"
                          value={med.instructions || ""}
                          onChange={(e) => updateMedication(index, "instructions", e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Investigations */}
              <div>
                <Label className="text-xs font-medium mb-2 block">Investigations Advised</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder={selectedPatient ? "e.g., CBC, LFT, ECG" : "--"}
                    value={newInvestigation}
                    onChange={(e) => setNewInvestigation(e.target.value)}
                    disabled={!selectedPatient}
                    onKeyDown={(e) => e.key === "Enter" && addInvestigation()}
                    className="text-sm"
                    data-testid="investigation-input"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addInvestigation}
                    disabled={!selectedPatient || !newInvestigation.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {investigations.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {investigations.map((inv, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded text-sm"
                      >
                        {inv}
                        <button
                          onClick={() => removeInvestigation(index)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Special Instructions */}
              <div>
                <Label htmlFor="special-instructions" className="text-xs font-medium">
                  Special Instructions
                </Label>
                <Input
                  id="special-instructions"
                  placeholder={selectedPatient ? "e.g., Bed rest, plenty of fluids" : "--"}
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  disabled={!selectedPatient}
                  className="mt-1"
                />
              </div>

              {/* Follow-up */}
              <div>
                <Label htmlFor="follow-up" className="text-xs font-medium">
                  Follow-up
                </Label>
                <Input
                  id="follow-up"
                  placeholder={selectedPatient ? "e.g., After 1 week" : "--"}
                  value={followUp}
                  onChange={(e) => setFollowUp(e.target.value)}
                  disabled={!selectedPatient}
                  className="mt-1"
                  data-testid="follow-up-input"
                />
              </div>
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="flex gap-2 mt-4 justify-end items-center">
            {saveSuccess && (
              <span className="text-sm text-green-600 flex items-center gap-1">
                <Check className="h-4 w-4" />
                Saved
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={!selectedPatient}
              onClick={handleSave}
              data-testid="save-prescription-btn"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Save Draft
            </Button>
            <Button variant="outline" size="sm" disabled={!selectedPatient}>
              Print
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!selectedPatient || isGeneratingPdf}
              onClick={handleGeneratePdf}
              data-testid="pdf-btn"
            >
              {isGeneratingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Download className="h-4 w-4 mr-1" />
              )}
              PDF
            </Button>
            <Button size="sm" disabled={!selectedPatient} data-testid="send-prescription-btn">
              Send
            </Button>
          </div>
        </div>
      </ScrollArea>
    </main>
  );
}
