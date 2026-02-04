"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Shield,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Activity,
  MessageSquare,
  Loader2,
} from "lucide-react";
import {
  runEmergencyDetectionTests,
  checkConfigurationSafety,
  calculateHealthScore,
  SafetyCheckResult,
} from "@/lib/safety-checks";

interface QADashboardProps {
  doctorId: Id<"doctors">;
}

export function QADashboard({ doctorId }: QADashboardProps) {
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [emergencyTestResults, setEmergencyTestResults] = useState<ReturnType<
    typeof runEmergencyDetectionTests
  > | null>(null);
  const [configChecks, setConfigChecks] = useState<SafetyCheckResult[]>([]);
  const [lastRunTime, setLastRunTime] = useState<Date | null>(null);

  const doctor = useQuery(api.doctors.get, { doctorId });
  const paymentStats = useQuery(api.payments.getStats, { doctorId, days: 30 });
  const auditStats = useQuery(api.auditLog.getStats, { doctorId, days: 30 });

  const runAllTests = async () => {
    setIsRunningTests(true);

    // Run emergency detection tests
    const emergencyResults = runEmergencyDetectionTests();
    setEmergencyTestResults(emergencyResults);

    // Run configuration safety checks
    if (doctor) {
      const configResults = checkConfigurationSafety({
        adminApprovalMode: doctor.adminApprovalMode,
        emergencyContact: doctor.emergencyContact,
        clinicPhone: doctor.phone,
      });
      setConfigChecks(configResults);
    }

    setLastRunTime(new Date());
    setIsRunningTests(false);
  };

  // Run tests on mount
  useEffect(() => {
    if (doctor) {
      runAllTests();
    }
  }, [doctor]);

  const allChecks = [...configChecks];
  const healthScore = allChecks.length > 0 ? calculateHealthScore(allChecks) : null;

  const StatusIcon = ({ status }: { status: "pass" | "warning" | "fail" }) => {
    switch (status) {
      case "pass":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case "fail":
        return <XCircle className="h-4 w-4 text-red-600" />;
    }
  };

  const gradeColor = (grade: string) => {
    switch (grade) {
      case "A":
        return "text-green-600 bg-green-100";
      case "B":
        return "text-blue-600 bg-blue-100";
      case "C":
        return "text-yellow-600 bg-yellow-100";
      case "D":
        return "text-orange-600 bg-orange-100";
      case "F":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Health Score */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            QA & Safety Dashboard
          </h2>
          <p className="text-gray-500 mt-1">
            System health checks and safety verification
          </p>
        </div>
        <div className="flex items-center gap-4">
          {healthScore && (
            <div className="text-center">
              <div
                className={`text-3xl font-bold px-4 py-2 rounded-lg ${gradeColor(
                  healthScore.grade
                )}`}
              >
                {healthScore.grade}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Score: {healthScore.score}%
              </p>
            </div>
          )}
          <Button onClick={runAllTests} disabled={isRunningTests}>
            {isRunningTests ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Run All Tests
              </>
            )}
          </Button>
        </div>
      </div>

      {lastRunTime && (
        <p className="text-sm text-gray-500">
          Last run: {lastRunTime.toLocaleString()}
        </p>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-600" />
              <span className="text-sm text-gray-500">Payments (30d)</span>
            </div>
            <p className="text-2xl font-bold">
              {paymentStats?.completed || 0} / {paymentStats?.total || 0}
            </p>
            <p className="text-xs text-gray-400">completed / total</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-gray-500">Audit Events</span>
            </div>
            <p className="text-2xl font-bold">{auditStats?.recent || 0}</p>
            <p className="text-xs text-gray-400">last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-purple-600" />
              <span className="text-sm text-gray-500">Approval Mode</span>
            </div>
            <p className="text-xl font-bold capitalize">
              {doctor?.adminApprovalMode || "N/A"}
            </p>
            <p className="text-xs text-gray-400">current setting</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-gray-500">Safety Checks</span>
            </div>
            <p className="text-2xl font-bold">
              {configChecks.filter((c) => c.status === "pass").length} /{" "}
              {configChecks.length}
            </p>
            <p className="text-xs text-gray-400">passed</p>
          </CardContent>
        </Card>
      </div>

      {/* Configuration Safety Checks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Configuration Safety Checks
          </CardTitle>
          <CardDescription>
            Verification of system configuration and safety settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Check</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configChecks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <p className="text-gray-500">
                      Click "Run All Tests" to perform safety checks
                    </p>
                  </TableCell>
                </TableRow>
              )}
              {configChecks.map((check, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{check.check}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <StatusIcon status={check.status} />
                      <span
                        className={`capitalize ${
                          check.status === "pass"
                            ? "text-green-600"
                            : check.status === "warning"
                            ? "text-yellow-600"
                            : "text-red-600"
                        }`}
                      >
                        {check.status}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{check.message}</TableCell>
                  <TableCell className="text-gray-500 text-sm">
                    {check.details || "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Emergency Detection Tests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Emergency Detection Tests
          </CardTitle>
          <CardDescription>
            Verification of emergency keyword detection for cardiology
          </CardDescription>
        </CardHeader>
        <CardContent>
          {emergencyTestResults ? (
            <>
              <div className="flex items-center gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium">
                    {emergencyTestResults.passed} passed
                  </span>
                </div>
                {emergencyTestResults.failed > 0 && (
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <span className="font-medium text-red-600">
                      {emergencyTestResults.failed} failed
                    </span>
                  </div>
                )}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test Message</TableHead>
                    <TableHead>Expected</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Matched Keywords</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emergencyTestResults.results.map((result, idx) => (
                    <TableRow
                      key={idx}
                      className={!result.passed ? "bg-red-50" : ""}
                    >
                      <TableCell className="max-w-md truncate">
                        {result.message}
                      </TableCell>
                      <TableCell>
                        {result.expected ? (
                          <span className="text-red-600">Emergency</span>
                        ) : (
                          <span className="text-green-600">Normal</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {result.passed ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                          <span
                            className={
                              result.passed ? "text-green-600" : "text-red-600"
                            }
                          >
                            {result.passed ? "Pass" : "Fail"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {result.matchedKeywords.length > 0
                          ? result.matchedKeywords.join(", ")
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          ) : (
            <p className="text-gray-500 text-center py-8">
              Click "Run All Tests" to run emergency detection tests
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recommendations */}
      {configChecks.some((c) => c.status !== "pass") && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-5 w-5" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {configChecks
                .filter((c) => c.status !== "pass")
                .map((check, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <span>
                      <strong>{check.check}:</strong> {check.details || check.message}
                    </span>
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
