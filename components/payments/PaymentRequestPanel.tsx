"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  IndianRupee,
  Send,
  Link2,
  CheckCircle,
  Clock,
  XCircle,
  Copy,
  MessageSquare,
  Loader2,
} from "lucide-react";

interface PaymentRequestPanelProps {
  doctorId: Id<"doctors">;
  patientId?: Id<"patients">;
  appointmentId?: Id<"appointments">;
  patientName?: string;
  patientPhone?: string;
  onPaymentCreated?: (paymentId: Id<"payments">) => void;
}

export function PaymentRequestPanel({
  doctorId,
  patientId,
  appointmentId,
  patientName: initialPatientName,
  patientPhone: initialPatientPhone,
  onPaymentCreated,
}: PaymentRequestPanelProps) {
  const [amount, setAmount] = useState("");
  const [patientName, setPatientName] = useState(initialPatientName || "");
  const [patientPhone, setPatientPhone] = useState(initialPatientPhone || "");
  const [description, setDescription] = useState("");
  const [expireInHours, setExpireInHours] = useState("24");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const doctor = useQuery(api.doctors.get, { doctorId });
  const createPayment = useMutation(api.payments.create);
  const setRazorpayOrderId = useMutation(api.payments.setRazorpayOrderId);

  const handleGenerateLink = async () => {
    if (!amount || !patientName || !patientPhone) {
      setError("Please fill in all required fields");
      return;
    }

    if (!patientId) {
      setError("Patient ID is required");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setPaymentLink(null);

    try {
      // Create payment record in database
      const paymentId = await createPayment({
        doctorId,
        patientId,
        appointmentId: appointmentId!,
        amount: Math.round(parseFloat(amount) * 100), // Convert to paise
        currency: "INR",
      });

      // Generate payment link via API
      const response = await fetch("/api/payments/create-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(amount),
          appointmentId,
          patientName,
          patientPhone,
          doctorName: doctor?.name,
          description: description || `Consultation fee`,
          expireInHours: parseInt(expireInHours),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create payment link");
      }

      const data = await response.json();

      // Update payment record with Razorpay link ID
      await setRazorpayOrderId({
        paymentId,
        razorpayOrderId: data.linkId,
      });

      setPaymentLink(data.shortUrl);
      onPaymentCreated?.(paymentId);
    } catch (err) {
      console.error("Error generating payment link:", err);
      setError("Failed to generate payment link. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    if (paymentLink) {
      await navigator.clipboard.writeText(paymentLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!paymentLink || !patientPhone) return;

    setIsSendingWhatsApp(true);
    try {
      const whatsappAdapterUrl =
        process.env.NEXT_PUBLIC_WHATSAPP_ADAPTER_URL || "http://localhost:3001";

      const message = `Dear ${patientName},\n\nPlease find below the payment link for your consultation with Dr. ${doctor?.name || "Doctor"}.\n\nAmount: ₹${amount}\nPayment Link: ${paymentLink}\n\nThis link will expire in ${expireInHours} hours.\n\nThank you.`;

      const response = await fetch(`${whatsappAdapterUrl}/send-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: patientPhone,
          message,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send WhatsApp message");
      }

      alert("Payment link sent via WhatsApp!");
    } catch (err) {
      console.error("Error sending WhatsApp:", err);
      setError("Failed to send via WhatsApp. Link copied to clipboard instead.");
      handleCopyLink();
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  const presetAmounts = ["500", "1000", "1500", "2000"];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IndianRupee className="h-5 w-5" />
          Request Payment
        </CardTitle>
        <CardDescription>
          Generate a UPI payment link and send it to the patient via WhatsApp
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Amount */}
        <div className="space-y-2">
          <Label htmlFor="amount">Amount (₹) *</Label>
          <Input
            id="amount"
            type="number"
            placeholder="Enter amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <div className="flex gap-2 flex-wrap">
            {presetAmounts.map((preset) => (
              <Button
                key={preset}
                variant={amount === preset ? "default" : "outline"}
                size="sm"
                onClick={() => setAmount(preset)}
              >
                ₹{preset}
              </Button>
            ))}
          </div>
        </div>

        {/* Patient Name */}
        <div className="space-y-2">
          <Label htmlFor="patientName">Patient Name *</Label>
          <Input
            id="patientName"
            placeholder="Enter patient name"
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
          />
        </div>

        {/* Patient Phone */}
        <div className="space-y-2">
          <Label htmlFor="patientPhone">Patient Phone *</Label>
          <Input
            id="patientPhone"
            placeholder="Enter phone number"
            value={patientPhone}
            onChange={(e) => setPatientPhone(e.target.value)}
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Input
            id="description"
            placeholder="e.g., Follow-up consultation"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Expiry */}
        <div className="space-y-2">
          <Label htmlFor="expiry">Link Expires In</Label>
          <Select value={expireInHours} onValueChange={setExpireInHours}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 hour</SelectItem>
              <SelectItem value="6">6 hours</SelectItem>
              <SelectItem value="12">12 hours</SelectItem>
              <SelectItem value="24">24 hours</SelectItem>
              <SelectItem value="48">48 hours</SelectItem>
              <SelectItem value="168">7 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Error */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
            {error}
          </div>
        )}

        {/* Generate Button */}
        {!paymentLink && (
          <Button
            className="w-full"
            onClick={handleGenerateLink}
            disabled={isGenerating || !amount || !patientName || !patientPhone}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4 mr-2" />
                Generate Payment Link
              </>
            )}
          </Button>
        )}

        {/* Payment Link Generated */}
        {paymentLink && (
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <div className="flex items-center gap-2 text-green-700 mb-2">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">Payment link generated!</span>
              </div>
              <div className="bg-white rounded border p-2 text-sm break-all">
                {paymentLink}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleCopyLink}
              >
                {linkCopied ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </>
                )}
              </Button>
              <Button
                className="flex-1"
                onClick={handleSendWhatsApp}
                disabled={isSendingWhatsApp}
              >
                {isSendingWhatsApp ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send via WhatsApp
                  </>
                )}
              </Button>
            </div>

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                setPaymentLink(null);
                setAmount("");
                setDescription("");
              }}
            >
              Create Another Payment Link
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Payment Status Badge Component
export function PaymentStatusBadge({
  status,
}: {
  status: "pending" | "completed" | "failed";
}) {
  const statusConfig = {
    pending: {
      icon: Clock,
      label: "Pending",
      className: "bg-yellow-100 text-yellow-800",
    },
    completed: {
      icon: CheckCircle,
      label: "Paid",
      className: "bg-green-100 text-green-800",
    },
    failed: {
      icon: XCircle,
      label: "Failed",
      className: "bg-red-100 text-red-800",
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.className}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}
