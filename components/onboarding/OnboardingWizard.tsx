"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CheckCircle,
  User,
  Building,
  Stethoscope,
  Shield,
  ArrowRight,
  ArrowLeft,
  Loader2,
} from "lucide-react";

interface OnboardingWizardProps {
  onComplete: () => void;
}

type Step = "personal" | "clinic" | "specialization" | "safety" | "review";

interface FormData {
  // Personal
  name: string;
  phone: string;
  email: string;
  registrationNumber: string;
  qualifications: string;
  // Clinic
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string;
  // Specialization
  specialty: string;
  emergencyContact: string;
  emergencyTemplate: string;
  // Safety
  adminApprovalMode: string;
  consultationFee: string;
}

const STEPS: { id: Step; title: string; icon: React.ReactNode }[] = [
  { id: "personal", title: "Personal Info", icon: <User className="h-5 w-5" /> },
  { id: "clinic", title: "Clinic Details", icon: <Building className="h-5 w-5" /> },
  { id: "specialization", title: "Specialization", icon: <Stethoscope className="h-5 w-5" /> },
  { id: "safety", title: "Safety Settings", icon: <Shield className="h-5 w-5" /> },
  { id: "review", title: "Review & Submit", icon: <CheckCircle className="h-5 w-5" /> },
];

const SPECIALTIES = [
  "Cardiology",
  "General Medicine",
  "Orthopedics",
  "Pediatrics",
  "Dermatology",
  "Gynecology",
  "ENT",
  "Ophthalmology",
  "Psychiatry",
  "Other",
];

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState<Step>("personal");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    phone: "",
    email: "",
    registrationNumber: "",
    qualifications: "",
    clinicName: "",
    clinicAddress: "",
    clinicPhone: "",
    specialty: "",
    emergencyContact: "",
    emergencyTemplate: "Please call emergency services immediately. If you experience severe symptoms, go to the nearest hospital.",
    adminApprovalMode: "confirm",
    consultationFee: "500",
  });

  const createDoctor = useMutation(api.doctors.create);

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  const validateStep = (): boolean => {
    switch (currentStep) {
      case "personal":
        if (!formData.name || !formData.phone || !formData.registrationNumber) {
          setError("Please fill in all required fields");
          return false;
        }
        if (!/^\d{10}$/.test(formData.phone)) {
          setError("Please enter a valid 10-digit phone number");
          return false;
        }
        break;
      case "clinic":
        if (!formData.clinicName || !formData.clinicAddress) {
          setError("Please fill in clinic name and address");
          return false;
        }
        break;
      case "specialization":
        if (!formData.specialty) {
          setError("Please select a specialty");
          return false;
        }
        break;
    }
    return true;
  };

  const goToNext = () => {
    if (!validateStep()) return;
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex].id);
    }
  };

  const goToPrevious = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].id);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await createDoctor({
        name: formData.name,
        phone: formData.phone,
        email: formData.email || undefined,
        registrationNumber: formData.registrationNumber,
        qualifications: formData.qualifications,
        clinicName: formData.clinicName,
        clinicAddress: formData.clinicAddress,
        specialty: formData.specialty,
      });
      onComplete();
    } catch (err) {
      console.error("Error creating doctor profile:", err);
      setError("Failed to create profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                  index < currentStepIndex
                    ? "bg-green-500 border-green-500 text-white"
                    : index === currentStepIndex
                    ? "bg-blue-500 border-blue-500 text-white"
                    : "bg-white border-gray-300 text-gray-400"
                }`}
              >
                {index < currentStepIndex ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  step.icon
                )}
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`w-12 md:w-24 h-1 mx-2 ${
                    index < currentStepIndex ? "bg-green-500" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2">
          {STEPS.map((step) => (
            <span
              key={step.id}
              className={`text-xs md:text-sm ${
                step.id === currentStep ? "text-blue-600 font-medium" : "text-gray-400"
              }`}
            >
              {step.title}
            </span>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentStepIndex].title}</CardTitle>
          <CardDescription>
            {currentStep === "personal" && "Enter your personal and professional details"}
            {currentStep === "clinic" && "Tell us about your clinic"}
            {currentStep === "specialization" && "Configure your medical specialty"}
            {currentStep === "safety" && "Set up safety and approval settings"}
            {currentStep === "review" && "Review your information before submitting"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Personal Info Step */}
          {currentStep === "personal" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  placeholder="Dr. John Doe"
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  placeholder="9876543210"
                  value={formData.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (optional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="doctor@example.com"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="registrationNumber">Medical Registration Number *</Label>
                <Input
                  id="registrationNumber"
                  placeholder="MH/12345"
                  value={formData.registrationNumber}
                  onChange={(e) => updateField("registrationNumber", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qualifications">Qualifications</Label>
                <Input
                  id="qualifications"
                  placeholder="MBBS, MD (Medicine)"
                  value={formData.qualifications}
                  onChange={(e) => updateField("qualifications", e.target.value)}
                />
              </div>
            </>
          )}

          {/* Clinic Details Step */}
          {currentStep === "clinic" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="clinicName">Clinic Name *</Label>
                <Input
                  id="clinicName"
                  placeholder="Heart Care Clinic"
                  value={formData.clinicName}
                  onChange={(e) => updateField("clinicName", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clinicAddress">Clinic Address *</Label>
                <Textarea
                  id="clinicAddress"
                  placeholder="123, Medical Complex, City - 400001"
                  value={formData.clinicAddress}
                  onChange={(e) => updateField("clinicAddress", e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clinicPhone">Clinic Phone (if different)</Label>
                <Input
                  id="clinicPhone"
                  placeholder="022-12345678"
                  value={formData.clinicPhone}
                  onChange={(e) => updateField("clinicPhone", e.target.value)}
                />
              </div>
            </>
          )}

          {/* Specialization Step */}
          {currentStep === "specialization" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="specialty">Specialty *</Label>
                <Select
                  value={formData.specialty}
                  onValueChange={(value) => updateField("specialty", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your specialty" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPECIALTIES.map((specialty) => (
                      <SelectItem key={specialty} value={specialty}>
                        {specialty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="consultationFee">Consultation Fee (₹)</Label>
                <Input
                  id="consultationFee"
                  type="number"
                  placeholder="500"
                  value={formData.consultationFee}
                  onChange={(e) => updateField("consultationFee", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyContact">Emergency Contact Number</Label>
                <Input
                  id="emergencyContact"
                  placeholder="For emergency escalation"
                  value={formData.emergencyContact}
                  onChange={(e) => updateField("emergencyContact", e.target.value)}
                />
              </div>
            </>
          )}

          {/* Safety Settings Step */}
          {currentStep === "safety" && (
            <>
              <div className="space-y-2">
                <Label>Approval Mode for WhatsApp Messages</Label>
                <Select
                  value={formData.adminApprovalMode}
                  onValueChange={(value) => updateField("adminApprovalMode", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confirm">
                      Confirm All (Recommended)
                    </SelectItem>
                    <SelectItem value="auto">Auto-approve Non-clinical</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">
                  "Confirm All" ensures you review every message before it's sent to patients
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyTemplate">Emergency Response Template</Label>
                <Textarea
                  id="emergencyTemplate"
                  value={formData.emergencyTemplate}
                  onChange={(e) => updateField("emergencyTemplate", e.target.value)}
                  rows={4}
                />
                <p className="text-sm text-gray-500">
                  This message is sent when an emergency is detected
                </p>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <h4 className="font-medium text-yellow-800 mb-2">Safety Note</h4>
                <p className="text-sm text-yellow-700">
                  The system will automatically detect emergency keywords like "chest pain",
                  "breathless", "unconscious" and flag them for immediate attention.
                  Clinical messages always require your approval before sending.
                </p>
              </div>
            </>
          )}

          {/* Review Step */}
          {currentStep === "review" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-500 text-sm">Personal Information</h4>
                  <p className="font-semibold">{formData.name}</p>
                  <p className="text-sm text-gray-600">{formData.phone}</p>
                  <p className="text-sm text-gray-600">{formData.email || "-"}</p>
                  <p className="text-sm text-gray-600">Reg: {formData.registrationNumber}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-500 text-sm">Clinic</h4>
                  <p className="font-semibold">{formData.clinicName}</p>
                  <p className="text-sm text-gray-600">{formData.clinicAddress}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-500 text-sm">Specialty</h4>
                  <p className="font-semibold">{formData.specialty}</p>
                  <p className="text-sm text-gray-600">
                    Consultation Fee: ₹{formData.consultationFee}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-500 text-sm">Safety Settings</h4>
                  <p className="text-sm">
                    Approval Mode:{" "}
                    <span className="font-medium">
                      {formData.adminApprovalMode === "confirm"
                        ? "Confirm All"
                        : "Auto-approve"}
                    </span>
                  </p>
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <h4 className="font-medium text-green-800 mb-1">Ready to Go!</h4>
                <p className="text-sm text-green-700">
                  Click "Complete Setup" to create your profile and start using the system.
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-md p-3 text-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={goToPrevious}
          disabled={currentStepIndex === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        {currentStep === "review" ? (
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating Profile...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete Setup
              </>
            )}
          </Button>
        ) : (
          <Button onClick={goToNext}>
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
