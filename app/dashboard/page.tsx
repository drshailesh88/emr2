"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";

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
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Button variant="outline" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>

        {doctor ? (
          <Card>
            <CardHeader>
              <CardTitle>Welcome, {doctor.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Specialty</p>
                  <p>{doctor.specialty}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Qualifications</p>
                  <p>{doctor.qualifications}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Clinic</p>
                  <p>{doctor.clinicName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Registration</p>
                  <p>{doctor.registrationNumber}</p>
                </div>
              </div>
              <p className="mt-6 text-muted-foreground">
                3-panel EMR interface coming in Task #8...
              </p>
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
      </div>
    </main>
  );
}
