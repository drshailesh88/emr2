"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  IndianRupee,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Download,
  RefreshCw,
} from "lucide-react";
import { PaymentStatusBadge } from "./PaymentRequestPanel";

interface PaymentHistoryPanelProps {
  doctorId: Id<"doctors">;
}

export function PaymentHistoryPanel({ doctorId }: PaymentHistoryPanelProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState("30");

  const payments = useQuery(api.payments.getByDoctor, {
    doctorId,
    status: statusFilter === "all" ? undefined : statusFilter,
    limit: 100,
  });

  const stats = useQuery(api.payments.getStats, {
    doctorId,
    days: parseInt(dateRange),
  });

  const formatAmount = (amountInPaise: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amountInPaise / 100);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const filteredPayments = payments?.filter((payment) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      payment.razorpayPaymentId?.toLowerCase().includes(query) ||
      payment.razorpayOrderId?.toLowerCase().includes(query)
    );
  });

  const handleExportCSV = () => {
    if (!filteredPayments?.length) return;

    const headers = [
      "Date",
      "Payment ID",
      "Amount",
      "Status",
      "Razorpay Order ID",
      "Razorpay Payment ID",
    ];

    const rows = filteredPayments.map((p) => [
      new Date(p.createdAt).toISOString(),
      p._id,
      (p.amount / 100).toString(),
      p.status,
      p.razorpayOrderId || "",
      p.razorpayPaymentId || "",
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payments-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm text-gray-500">Total Collected</span>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {formatAmount(stats.totalAmount)}
              </p>
              <p className="text-xs text-gray-400">Last {dateRange} days</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-gray-500">Completed</span>
              </div>
              <p className="text-2xl font-bold">{stats.completed}</p>
              <p className="text-xs text-gray-400">payments</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-gray-500">Pending</span>
              </div>
              <p className="text-2xl font-bold text-yellow-600">
                {stats.pending}
              </p>
              <p className="text-xs text-gray-400">payments</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-gray-500">Average</span>
              </div>
              <p className="text-2xl font-bold">
                {formatAmount(stats.averageAmount)}
              </p>
              <p className="text-xs text-gray-400">per payment</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5" />
              Payment History
            </span>
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </CardTitle>
          <CardDescription>
            View and track all payment transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by payment ID..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payment Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment ID</TableHead>
                  <TableHead>Completed At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="text-gray-500">
                        No payments found
                        {statusFilter !== "all" && ` with status "${statusFilter}"`}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {filteredPayments?.map((payment) => (
                  <TableRow key={payment._id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(payment.createdAt)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatAmount(payment.amount)}
                    </TableCell>
                    <TableCell>
                      <PaymentStatusBadge
                        status={payment.status as "pending" | "completed" | "failed"}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-gray-500 font-mono">
                      {payment.razorpayPaymentId || payment.razorpayOrderId || "-"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-gray-500">
                      {payment.completedAt
                        ? formatDate(payment.completedAt)
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
