"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/convex/_generated/api";

export default function SignupPage() {
  const { signIn } = useAuthActions();
  const createDoctor = useMutation(api.doctors.create);
  const user = useQuery(api.users.current);
  const router = useRouter();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    phone: "",
    specialty: "",
    qualifications: "",
    clinicName: "",
    clinicAddress: "",
    registrationNumber: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Account, 2: Profile
  const [waitingForAuth, setWaitingForAuth] = useState(false);
  const profileDataRef = useRef<typeof formData | null>(null);

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Effect to create doctor profile once authenticated
  useEffect(() => {
    const createProfile = async () => {
      if (waitingForAuth && user && profileDataRef.current) {
        try {
          await createDoctor({
            name: profileDataRef.current.name,
            phone: profileDataRef.current.phone,
            email: profileDataRef.current.email,
            specialty: profileDataRef.current.specialty,
            qualifications: profileDataRef.current.qualifications,
            clinicName: profileDataRef.current.clinicName,
            clinicAddress: profileDataRef.current.clinicAddress,
            registrationNumber: profileDataRef.current.registrationNumber,
          });
          router.push("/dashboard");
        } catch (err) {
          setError("Failed to create doctor profile. Please try again.");
          console.error("Create doctor error:", err);
          setWaitingForAuth(false);
          setIsLoading(false);
        }
      }
    };
    createProfile();
  }, [user, waitingForAuth, createDoctor, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (step === 1) {
      // Validate step 1
      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match");
        return;
      }
      if (formData.password.length < 8) {
        setError("Password must be at least 8 characters");
        return;
      }
      setStep(2);
      return;
    }

    // Step 2: Create account and profile
    setIsLoading(true);

    try {
      // Store profile data for after auth completes
      profileDataRef.current = formData;

      // First, sign up the user
      const authFormData = new FormData();
      authFormData.set("email", formData.email);
      authFormData.set("password", formData.password);
      authFormData.set("flow", "signUp");

      await signIn("password", authFormData);

      // Set flag to wait for auth state to sync
      setWaitingForAuth(true);

      // The useEffect above will handle creating the doctor profile
      // once the user query returns the authenticated user
    } catch (err) {
      setError("Failed to create account. Email may already be registered.");
      console.error("Signup error:", err);
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>
            {step === 1
              ? "Set up your login credentials"
              : "Complete your doctor profile"}
          </CardDescription>
          <div className="flex justify-center gap-2 mt-4">
            <div
              className={`w-3 h-3 rounded-full ${
                step === 1 ? "bg-primary" : "bg-muted"
              }`}
            />
            <div
              className={`w-3 h-3 rounded-full ${
                step === 2 ? "bg-primary" : "bg-muted"
              }`}
            />
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                {error}
              </div>
            )}

            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="doctor@example.com"
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="At least 8 characters"
                    value={formData.password}
                    onChange={(e) => updateField("password", e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter password"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      updateField("confirmPassword", e.target.value)
                    }
                    required
                    disabled={isLoading}
                  />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      placeholder="Dr. Name"
                      value={formData.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      placeholder="+91 98765 43210"
                      value={formData.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="specialty">Specialty</Label>
                    <Input
                      id="specialty"
                      placeholder="Cardiology"
                      value={formData.specialty}
                      onChange={(e) => updateField("specialty", e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="qualifications">Qualifications</Label>
                    <Input
                      id="qualifications"
                      placeholder="MBBS, MD, DM"
                      value={formData.qualifications}
                      onChange={(e) =>
                        updateField("qualifications", e.target.value)
                      }
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clinicName">Clinic Name</Label>
                  <Input
                    id="clinicName"
                    placeholder="Heart Care Clinic"
                    value={formData.clinicName}
                    onChange={(e) => updateField("clinicName", e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clinicAddress">Clinic Address</Label>
                  <Input
                    id="clinicAddress"
                    placeholder="123 Main Street, City"
                    value={formData.clinicAddress}
                    onChange={(e) =>
                      updateField("clinicAddress", e.target.value)
                    }
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registrationNumber">
                    Registration Number (MCI/State)
                  </Label>
                  <Input
                    id="registrationNumber"
                    placeholder="MCI-12345"
                    value={formData.registrationNumber}
                    onChange={(e) =>
                      updateField("registrationNumber", e.target.value)
                    }
                    required
                    disabled={isLoading}
                  />
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <div className="flex gap-2 w-full">
              {step === 2 && (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep(1)}
                  disabled={isLoading}
                >
                  Back
                </Button>
              )}
              <Button
                type="submit"
                className={step === 1 ? "w-full" : "flex-1"}
                disabled={isLoading}
              >
                {isLoading
                  ? "Creating account..."
                  : step === 1
                    ? "Continue"
                    : "Create Account"}
              </Button>
            </div>
            <p className="text-sm text-center text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </main>
  );
}
