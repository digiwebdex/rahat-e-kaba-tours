import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { apiClient } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Upload, Check } from "lucide-react";
import { Helmet } from "react-helmet-async";

const SLUG_TO_CODE: Record<string, string> = {
  "work-permit": "work_permit",
  "air-ticket": "air_ticket",
  "visa": "visa",
};

const DOC_TYPES: Record<string, { key: string; label: string; required?: boolean }[]> = {
  work_permit: [
    { key: "passport", label: "Passport (scan)", required: true },
    { key: "photo", label: "Passport-size Photo", required: true },
    { key: "nid", label: "National ID" },
    { key: "education", label: "Education Certificate" },
    { key: "experience", label: "Experience Letter" },
  ],
  air_ticket: [
    { key: "passport", label: "Passport (scan)", required: true },
    { key: "photo", label: "Passport-size Photo" },
  ],
  visa: [
    { key: "passport", label: "Passport (scan)", required: true },
    { key: "photo", label: "Passport-size Photo", required: true },
    { key: "nid", label: "National ID" },
    { key: "other", label: "Supporting Documents" },
  ],
};

const API_BASE = import.meta.env.VITE_API_URL || "/api";

async function uploadFile(file: File, bucket = "applications") {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("bucket", bucket);
  fd.append("path", `${Date.now()}-${file.name}`);
  const token = localStorage.getItem("rk_access_token");
  const res = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: fd,
  });
  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}

export default function ApplyPage() {
  const { service: slug = "" } = useParams();
  const navigate = useNavigate();
  const serviceCode = SLUG_TO_CODE[slug] || slug.replace(/-/g, "_");

  const [services, setServices] = useState<any[]>([]);
  const [methods, setMethods] = useState<any[]>([]);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [submitting, setSubmitting] = useState(false);
  const [createdApp, setCreatedApp] = useState<any | null>(null);

  // Form state
  const [customer, setCustomer] = useState({
    full_name: "", phone: "", email: "", nid_number: "", passport_number: "",
    address: "", city: "",
  });
  const [data, setData] = useState<Record<string, string>>({});
  const [totalAmount, setTotalAmount] = useState<string>("");

  // Payment state
  const [methodCode, setMethodCode] = useState<string>("");
  const [payAmount, setPayAmount] = useState<string>("");
  const [txnRef, setTxnRef] = useState<string>("");
  const [proofPath, setProofPath] = useState<string>("");

  useEffect(() => {
    apiClient.get("/public/services").then(setServices);
    apiClient.get("/public/payment-methods").then(setMethods);
  }, []);

  const service = useMemo(() => services.find((s) => s.code === serviceCode), [services, serviceCode]);
  const docList = DOC_TYPES[serviceCode] || DOC_TYPES.work_permit;

  const dataFields = useMemo(() => {
    if (serviceCode === "work_permit") return [
      { key: "country", label: "Destination Country", required: true },
      { key: "job_title", label: "Job / Position" },
      { key: "experience_years", label: "Years of Experience" },
    ];
    if (serviceCode === "air_ticket") return [
      { key: "from_city", label: "From", required: true },
      { key: "to_city", label: "To", required: true },
      { key: "depart_date", label: "Departure Date", required: true },
      { key: "return_date", label: "Return Date (optional)" },
      { key: "passengers", label: "Passengers" },
    ];
    if (serviceCode === "visa") return [
      { key: "country", label: "Country", required: true },
      { key: "visa_type", label: "Visa Type", required: true },
      { key: "travel_date", label: "Intended Travel Date" },
    ];
    return [];
  }, [serviceCode]);

  const submitApplication = async () => {
    if (!customer.full_name || !customer.phone) {
      toast.error("Name and phone are required"); return;
    }
    for (const f of dataFields) {
      if (f.required && !data[f.key]) { toast.error(`${f.label} is required`); return; }
    }
    try {
      setSubmitting(true);
      const res = await apiClient.post("/public/applications", {
        service_code: serviceCode,
        customer,
        application_data: data,
        total_amount: Number(totalAmount) || 0,
      });
      setCreatedApp(res.application);
      setPayAmount(String(res.application.total_amount || ""));
      toast.success(`Application submitted — ${res.application.tracking_id}`);
      setStep(3);
    } catch (e: any) {
      toast.error(e.message || "Failed to submit");
    } finally { setSubmitting(false); }
  };

  const handleDocUpload = async (docKey: string, file: File) => {
    if (!createdApp) return;
    try {
      const up = await uploadFile(file);
      await apiClient.post(`/public/applications/${createdApp.id}/documents`, {
        doc_type: docKey,
        file_name: file.name,
        file_path: up.file_path,
        file_size: up.file_size,
        mime_type: file.type,
      });
      toast.success(`${docKey} uploaded`);
    } catch (e: any) { toast.error(e.message || "Upload failed"); }
  };

  const handleProofUpload = async (file: File) => {
    try {
      const up = await uploadFile(file, "payment-proofs");
      setProofPath(up.file_path);
      toast.success("Proof uploaded");
    } catch (e: any) { toast.error(e.message || "Upload failed"); }
  };

  const submitManualPayment = async () => {
    if (!createdApp || !methodCode || !payAmount) { toast.error("Fill payment details"); return; }
    const selected = methods.find((m) => m.code === methodCode);
    if (selected?.requires_proof && !proofPath) { toast.error("Proof required for this method"); return; }
    try {
      setSubmitting(true);
      await apiClient.post("/public/payments/manual", {
        application_id: createdApp.id,
        amount: Number(payAmount),
        method_code: methodCode,
        transaction_ref: txnRef || null,
        proof_file_path: proofPath || null,
      });
      toast.success("Payment submitted — pending admin verification");
      setStep(4);
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setSubmitting(false); }
  };

  const startOnlinePayment = async () => {
    if (!createdApp || !payAmount) return;
    try {
      setSubmitting(true);
      const res = await apiClient.post("/payments/online/initiate", {
        application_id: createdApp.id,
        amount: Number(payAmount),
        customer: { name: customer.full_name, phone: customer.phone, email: customer.email },
      });
      if (res.gateway_url) window.location.href = res.gateway_url;
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setSubmitting(false); }
  };

  if (!service && services.length > 0) {
    return <div className="container mx-auto p-12 text-center">Unknown service.</div>;
  }

  const stepLabels = ["Your Details", "Documents", "Payment", "Done"];

  return (
    <>
      <Helmet><title>Apply for {service?.name_en || "Service"} — Al Rawsha</title></Helmet>
      <main className="min-h-screen bg-background py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="text-3xl font-bold mb-2">{service?.name_en || "Apply"}</h1>
          <p className="text-muted-foreground mb-8">Complete the steps below to submit your application.</p>

          {/* Stepper */}
          <div className="flex items-center gap-2 mb-8">
            {stepLabels.map((lbl, i) => {
              const n = i + 1;
              const active = step === n; const done = step > n;
              return (
                <div key={lbl} className="flex-1 flex items-center gap-2">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium border ${
                    done ? "bg-primary text-primary-foreground border-primary" :
                    active ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>
                    {done ? <Check className="h-4 w-4" /> : n}
                  </div>
                  <span className={`text-xs ${active ? "text-foreground font-medium" : "text-muted-foreground"} hidden sm:inline`}>{lbl}</span>
                  {n < stepLabels.length && <div className={`flex-1 h-px ${done ? "bg-primary" : "bg-border"}`} />}
                </div>
              );
            })}
          </div>

          {/* Step 1: Details */}
          {step === 1 && (
            <Card className="p-6 space-y-5">
              <h2 className="text-lg font-semibold">Your Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Full Name *</Label><Input value={customer.full_name} onChange={(e) => setCustomer({ ...customer, full_name: e.target.value })} /></div>
                <div><Label>Phone *</Label><Input value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} /></div>
                <div><Label>Email</Label><Input type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} /></div>
                <div><Label>NID Number</Label><Input value={customer.nid_number} onChange={(e) => setCustomer({ ...customer, nid_number: e.target.value })} /></div>
                <div><Label>Passport Number</Label><Input value={customer.passport_number} onChange={(e) => setCustomer({ ...customer, passport_number: e.target.value })} /></div>
                <div><Label>City</Label><Input value={customer.city} onChange={(e) => setCustomer({ ...customer, city: e.target.value })} /></div>
                <div className="md:col-span-2"><Label>Address</Label><Textarea rows={2} value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} /></div>
              </div>

              <div className="border-t border-border pt-5">
                <h3 className="font-medium mb-3">Service Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dataFields.map((f) => (
                    <div key={f.key} className={f.key === "return_date" || f.key === "passengers" ? "" : ""}>
                      <Label>{f.label}{f.required ? " *" : ""}</Label>
                      <Input value={data[f.key] || ""} onChange={(e) => setData({ ...data, [f.key]: e.target.value })} />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Total Amount (BDT) — optional, admin can set later</Label>
                <Input type="number" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} />
              </div>

              <Button onClick={submitApplication} disabled={submitting} className="w-full" size="lg">
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Submit Application
              </Button>
            </Card>
          )}

          {/* Step 2: kept as part of step 3 flow — we go directly to 3 after submit */}

          {/* Step 3: Documents + Payment */}
          {step === 3 && createdApp && (
            <div className="space-y-6">
              <Card className="p-5 bg-primary/5 border-primary/30">
                <p className="text-sm">Application created. Your tracking ID:
                  <span className="font-mono font-bold ml-2">{createdApp.tracking_id}</span></p>
              </Card>

              <Card className="p-6 space-y-4">
                <h2 className="text-lg font-semibold">Upload Documents</h2>
                <p className="text-sm text-muted-foreground">PDF, JPG or PNG. Max 5 MB each.</p>
                <div className="space-y-3">
                  {docList.map((d) => (
                    <div key={d.key} className="flex items-center gap-3 p-3 border border-border rounded-md">
                      <span className="flex-1 text-sm">{d.label}{d.required ? " *" : ""}</span>
                      <label className="cursor-pointer">
                        <input type="file" className="hidden" accept="image/*,.pdf"
                          onChange={(e) => e.target.files?.[0] && handleDocUpload(d.key, e.target.files[0])} />
                        <span className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded bg-secondary text-secondary-foreground hover:bg-secondary/80">
                          <Upload className="h-3 w-3" /> Upload
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6 space-y-4">
                <h2 className="text-lg font-semibold">Payment</h2>
                <div>
                  <Label>Amount to Pay (BDT)</Label>
                  <Input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
                </div>

                <div>
                  <Label>Payment Method</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                    {methods.map((m) => (
                      <button key={m.code} type="button"
                        onClick={() => setMethodCode(m.code)}
                        className={`p-3 border rounded-md text-left text-sm transition-colors ${
                          methodCode === m.code ? "border-primary bg-primary/10" : "border-border hover:bg-muted/40"
                        }`}>
                        <div className="font-medium">{m.name}</div>
                        {m.account_no && <div className="text-xs text-muted-foreground">{m.account_no}</div>}
                      </button>
                    ))}
                  </div>
                </div>

                {methodCode && methods.find((m) => m.code === methodCode)?.is_online ? (
                  <Button onClick={startOnlinePayment} disabled={submitting || !payAmount} className="w-full" size="lg">
                    {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Pay Online via SSLCommerz
                  </Button>
                ) : methodCode ? (
                  <>
                    <div>
                      <Label>Transaction Reference (TrxID)</Label>
                      <Input value={txnRef} onChange={(e) => setTxnRef(e.target.value)} placeholder="e.g. bKash TrxID" />
                    </div>
                    {methods.find((m) => m.code === methodCode)?.requires_proof && (
                      <div>
                        <Label>Payment Proof (screenshot) *</Label>
                        <input type="file" accept="image/*,.pdf"
                          onChange={(e) => e.target.files?.[0] && handleProofUpload(e.target.files[0])}
                          className="block w-full text-sm mt-1" />
                        {proofPath && <p className="text-xs text-emerald-600 mt-1">Uploaded ✓</p>}
                      </div>
                    )}
                    <Button onClick={submitManualPayment} disabled={submitting} className="w-full" size="lg">
                      {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Submit Payment
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Select a payment method to continue.</p>
                )}

                <button type="button" onClick={() => setStep(4)}
                  className="text-xs text-muted-foreground underline">
                  Skip payment — I'll pay later
                </button>
              </Card>
            </div>
          )}

          {/* Step 4: Done */}
          {step === 4 && createdApp && (
            <Card className="p-8 text-center space-y-4">
              <div className="mx-auto h-14 w-14 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Check className="h-7 w-7" />
              </div>
              <h2 className="text-2xl font-bold">Application Submitted</h2>
              <p className="text-muted-foreground">Save your tracking ID to check status anytime.</p>
              <div className="font-mono text-lg font-bold bg-muted py-3 rounded">{createdApp.tracking_id}</div>
              <div className="flex gap-3 justify-center pt-2">
                <Button asChild variant="outline"><Link to={`/track?id=${createdApp.tracking_id}`}>Track Application</Link></Button>
                <Button onClick={() => navigate("/")}>Back to Home</Button>
              </div>
            </Card>
          )}
        </div>
      </main>
    </>
  );
}