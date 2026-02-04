# API Reference

## Payment Endpoints

### Create Payment Order

Creates a Razorpay order for checkout flow.

```
POST /api/payments/create-order
```

**Request Body:**
```json
{
  "amount": 500,           // Amount in rupees
  "appointmentId": "abc123",
  "patientName": "John Doe",
  "doctorName": "Dr. Smith"
}
```

**Response:**
```json
{
  "orderId": "order_123",
  "amount": 50000,         // Amount in paise
  "currency": "INR"
}
```

---

### Create Payment Link

Creates a shareable payment link (UPI, cards, etc.).

```
POST /api/payments/create-link
```

**Request Body:**
```json
{
  "amount": 500,
  "appointmentId": "abc123",
  "patientName": "John Doe",
  "patientPhone": "9876543210",
  "patientEmail": "john@example.com",  // optional
  "doctorName": "Dr. Smith",
  "description": "Consultation fee",    // optional
  "expireInHours": 24                   // optional, default 24
}
```

**Response:**
```json
{
  "linkId": "plink_123",
  "shortUrl": "https://rzp.io/i/abc",
  "amount": 50000,
  "currency": "INR",
  "status": "created",
  "expireBy": 1234567890
}
```

---

### Payment Webhook

Receives payment events from Razorpay.

```
POST /api/payments/webhook
```

**Headers:**
```
x-razorpay-signature: <webhook_signature>
```

**Handled Events:**
- `payment.captured`
- `payment.authorized`
- `payment.failed`
- `order.paid`

---

### Generate Receipt

Generates a PDF receipt for a completed payment.

```
POST /api/payments/receipt
```

**Request Body:**
```json
{
  "paymentId": "payment_123",
  "timestamp": 1234567890,
  "doctorName": "Dr. Smith",
  "doctorQualification": "MBBS, MD",
  "clinicName": "Heart Care Clinic",
  "clinicAddress": "123 Medical Complex",
  "clinicPhone": "022-12345678",
  "patientName": "John Doe",
  "patientPhone": "9876543210",
  "amount": 500,                        // in rupees
  "paymentMethod": "UPI",
  "razorpayPaymentId": "pay_123",
  "serviceDescription": "Consultation",
  "appointmentDate": "2024-01-15"
}
```

**Response:**
Returns PDF file with `Content-Type: application/pdf`

---

## Convex API Reference

### Doctors

#### `api.doctors.get`
Get doctor by ID.
```typescript
const doctor = await convex.query(api.doctors.get, { doctorId });
```

#### `api.doctors.getByPhone`
Get doctor by phone number.
```typescript
const doctor = await convex.query(api.doctors.getByPhone, { phone: "9876543210" });
```

#### `api.doctors.create`
Create new doctor profile.
```typescript
const doctorId = await convex.mutation(api.doctors.create, {
  name: "Dr. Smith",
  phone: "9876543210",
  specialty: "Cardiology",
  // ... other fields
});
```

---

### Patients

#### `api.patients.getByDoctor`
Get all patients for a doctor.
```typescript
const patients = await convex.query(api.patients.getByDoctor, { doctorId });
```

#### `api.patients.create`
Create new patient record.
```typescript
const patientId = await convex.mutation(api.patients.create, {
  doctorId,
  name: "John Doe",
  phone: "9876543210",
  whatsappId: "919876543210@s.whatsapp.net",
});
```

---

### Payments

#### `api.payments.create`
Create a payment record.
```typescript
const paymentId = await convex.mutation(api.payments.create, {
  doctorId,
  patientId,
  appointmentId,
  amount: 50000,  // in paise
  currency: "INR",
});
```

#### `api.payments.markCompleted`
Mark payment as completed.
```typescript
await convex.mutation(api.payments.markCompleted, {
  paymentId,
  razorpayPaymentId: "pay_123",
});
```

#### `api.payments.getStats`
Get payment statistics.
```typescript
const stats = await convex.query(api.payments.getStats, { doctorId, days: 30 });
// Returns: { total, completed, pending, failed, totalAmount, averageAmount, dailyRevenue }
```

---

### Feedback

#### `api.feedback.submit`
Submit user feedback.
```typescript
await convex.mutation(api.feedback.submit, {
  doctorId,
  category: "bug", // "bug" | "feature" | "usability" | "other"
  rating: 4,       // 1-5
  message: "The payment flow is great!",
  page: "/dashboard",
});
```

#### `api.feedback.submitNPS`
Submit Net Promoter Score.
```typescript
await convex.mutation(api.feedback.submitNPS, {
  doctorId,
  score: 9,  // 0-10
  comment: "Would definitely recommend!",
});
```

---

### Audit Log

#### `api.auditLog.getByDoctor`
Get audit logs for a doctor.
```typescript
const logs = await convex.query(api.auditLog.getByDoctor, {
  doctorId,
  limit: 50,
  actionFilter: "payment",
  startDate: Date.now() - 7 * 24 * 60 * 60 * 1000,
});
```

#### `api.auditLog.getStats`
Get audit statistics.
```typescript
const stats = await convex.query(api.auditLog.getStats, { doctorId, days: 7 });
// Returns: { total, recent, byAction, byPerformer, byDay }
```

---

## Error Handling

All API endpoints return errors in this format:

```json
{
  "error": "Error message here"
}
```

**HTTP Status Codes:**
- `400` - Bad Request (missing required fields)
- `401` - Unauthorized (invalid signature)
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limits

- API endpoints: No hard limits (be reasonable)
- Convex queries: Standard Convex limits apply
- Razorpay API: Subject to Razorpay rate limits
