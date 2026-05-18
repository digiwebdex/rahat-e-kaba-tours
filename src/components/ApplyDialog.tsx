import { useEffect, useState } from "react";
import { supabase } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, Briefcase, GraduationCap, CheckCircle, Copy } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/i18n/LanguageContext";
import { Link } from "react-router-dom";
import CustomerSearchSelect from "@/components/admin/CustomerSearchSelect";
import { PayOnlineButton } from "@/components/PayOnlineButton";
import DocumentUploadStep, { type UploadedDoc } from "@/components/booking/DocumentUploadStep";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";

export type ApplyServiceType = "work_permit" | "student_consultancy";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  serviceType: ApplyServiceType;
  /** Pre-selected position (work permit) or program (student) */
  preset?: string;
  /** When true, shows admin-only customer picker and treats submission as manual entry */
  adminMode?: boolean;
  /** Called after successful submission (admin flow) */
  onSubmitted?: () => void;
}

const COUNTRIES = ["United Kingdom", "Canada", "Australia", "United States", "Germany", "Malaysia", "Other"];
const STUDY_LEVELS = ["Foundation", "Bachelor's", "Master's", "PhD", "Diploma"];

const ApplyDialog = ({ open, onOpenChange, serviceType, preset, adminMode, onSubmitted }: Props) => {
  const { language } = useLanguage();
  const bn = language === "bn";
  const isWorkPermit = serviceType === "work_permit";
  const { methods: PAYMENT_METHODS } = usePaymentMethods();

  const [user, setUser] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ trackingId: string; bookingId: string; due: number } | null>(null);
  const [pickedCustomerId, setPickedCustomerId] = useState<string | null>(null);

  // Common fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [passport, setPassport] = useState("");
  const [notes, setNotes] = useState("");

  // Work-permit specific
  const [position, setPosition] = useState(preset || "");
  const [experience, setExperience] = useState("");
  const [age, setAge] = useState("");

  // Student-consultancy specific
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [program, setProgram] = useState(preset || "");
  const [level, setLevel] = useState(STUDY_LEVELS[1]);
  const [lastEducation, setLastEducation] = useState("");

  // Admin-only payment fields
  const [totalAmount, setTotalAmount] = useState<string>("0");
  const [advanceAmount, setAdvanceAmount] = useState<string>("0");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [walletId, setWalletId] = useState<string>("");
  const [txnRef, setTxnRef] = useState("");
  const [wallets, setWallets] = useState<any[]>([]);

  // Public: documents + auto service fee
  const [pkgInfo, setPkgInfo] = useState<{ id: string | null; price: number }>({ id: null, price: 0 });
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);

  // Admin-only: package list, traveler count, middleman selection
  const [packageList, setPackageList] = useState<Array<{ id: string; name: string; price: number }>>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");
  const [numTravelers, setNumTravelers] = useState<string>("1");
  const [middlemen, setMiddlemen] = useState<Array<{ id: string; agent_name: string; company_name: string | null }>>([]);
  const [middlemanId, setMiddlemanId] = useState<string>("none");

  useEffect(() => {
    if (!open || !adminMode) return;
    supabase.from("accounts").select("id, name, type").then(({ data }) => {
      const rows = (data || []).filter((a: any) => {
        const t = String(a.type || "").toLowerCase();
        const n = String(a.name || "").toLowerCase();
        return t === "asset" || t === "wallet" || /cash|bank|bkash|nagad|rocket|wallet/.test(n);
      }).sort((a: any, b: any) => String(a.name).localeCompare(String(b.name)));
      setWallets(rows);
      if (rows.length && !walletId) setWalletId(rows[0].id);
    });
    // Admin: load every active package for this service, plus middlemen list
    supabase
      .from("packages")
      .select("id, name, price")
      .eq("type", serviceType)
      .eq("is_active", true)
      .order("price", { ascending: true })
      .then(({ data }) => setPackageList((data as any) || []));
    supabase
      .from("supplier_agents")
      .select("id, agent_name, company_name")
      .eq("status", "active")
      .order("agent_name", { ascending: true })
      .then(({ data }) => setMiddlemen((data as any) || []));
  }, [open, adminMode, serviceType]);

  useEffect(() => {
    if (!open) return;
    setDone(null);
    setPosition(preset || "");
    setProgram(preset || "");
    setUploadedDocs([]);
    // Preload service package + price for both public & admin
    (async () => {
      const { data: pkg } = await supabase
        .from("packages")
        .select("id, price")
        .eq("type", serviceType)
        .limit(1)
        .maybeSingle();
      const price = Number(pkg?.price) || 0;
      setPkgInfo({ id: pkg?.id || null, price });
      if (adminMode && price > 0) setTotalAmount(String(price));
    })();
    if (adminMode) {
      // Admin manual entry — start with blank fields
      setUser(null);
      setPickedCustomerId(null);
      setFullName(""); setPhone(""); setEmail(""); setAddress(""); setPassport("");
      return;
    }
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", session.user.id).single();
        if (profile) {
          setFullName(profile.full_name || "");
          setPhone(profile.phone || "");
          setEmail(session.user.email || "");
          setAddress(profile.address || "");
          setPassport(profile.passport_number || "");
        }
      } else {
        setUser(null);
      }
    })();
  }, [open, preset, adminMode]);

  const reset = () => {
    setFullName(""); setPhone(""); setEmail(""); setAddress(""); setPassport("");
    setPosition(""); setExperience(""); setAge("");
    setCountry(COUNTRIES[0]); setProgram(""); setLevel(STUDY_LEVELS[1]); setLastEducation("");
    setNotes("");
    setTotalAmount("0"); setAdvanceAmount("0"); setPaymentMethod("cash"); setTxnRef("");
  };

  const submit = async () => {
    if (!fullName.trim() || !phone.trim()) {
      toast.error(bn ? "নাম এবং ফোন আবশ্যক" : "Name and phone are required");
      return;
    }
    if (isWorkPermit && !position.trim()) {
      toast.error(bn ? "পদের নাম দিন" : "Please specify the position");
      return;
    }
    if (!isWorkPermit && !program.trim()) {
      toast.error(bn ? "প্রোগ্রাম/বিষয় দিন" : "Please specify program/subject");
      return;
    }

    setSubmitting(true);
    try {
      const application_data = isWorkPermit
        ? { position, experience, age, destination: "Fiji" }
        : { country, program, level, last_education: lastEducation };

      // Public submissions auto-attach the standard service fee
      const computedTotal = adminMode
        ? Number(totalAmount) || 0
        : pkgInfo.price;

      const payload: any = {
        package_id: pkgInfo.id,
        service_type: serviceType,
        application_data,
        user_id: pickedCustomerId || user?.id || null,
        guest_name: fullName,
        guest_phone: phone,
        guest_email: email || null,
        guest_address: address || null,
        guest_passport: passport || null,
        num_travelers: adminMode ? Math.max(1, Number(numTravelers) || 1) : 1,
        total_amount: computedTotal,
        notes: notes || null,
        status: "pending",
        booking_type: "individual",
      };
      if (adminMode) {
        if (selectedPackageId) payload.package_id = selectedPackageId;
        if (middlemanId && middlemanId !== "none") payload.supplier_agent_id = middlemanId;
      }

      const { data, error } = await supabase
        .from("bookings").insert(payload).select("id, tracking_id").single();
      if (error) throw error;

      // Upload supporting documents — both public & admin flows now support this
      if (uploadedDocs.length > 0) {
        for (const doc of uploadedDocs) {
          try {
            const formData = new FormData();
            formData.append("booking_id", data.id);
            formData.append("tracking_id", data.tracking_id);
            formData.append("document_type", doc.type);
            formData.append("file", doc.file);
            const up = await supabase.functions.invoke("upload-booking-document", { body: formData });
            if (up.error) console.error("Doc upload failed:", doc.type, up.error);
          } catch (err) {
            console.error("Doc upload error:", doc.type, err);
          }
        }
      }

      // Record advance payment if provided (admin only)
      const advNum = Number(advanceAmount) || 0;
      if (adminMode && advNum > 0) {
        if (!walletId) {
          toast.error(bn ? "ওয়ালেট নির্বাচন করুন" : "Please select a wallet account");
        } else {
          const userId = pickedCustomerId || user?.id || "00000000-0000-0000-0000-000000000000";
          const { error: payErr } = await supabase.from("payments").insert({
            booking_id: data.id,
            user_id: userId,
            customer_id: pickedCustomerId || null,
            amount: advNum,
            payment_method: paymentMethod,
            transaction_id: txnRef.trim() || null,
            status: "completed",
            paid_at: new Date().toISOString(),
            due_date: new Date().toISOString().slice(0, 10),
            installment_number: 1,
            notes: "Advance at application creation",
            wallet_account_id: walletId,
          } as any);
          if (payErr) toast.error("Booking created but payment failed: " + payErr.message);
        }
      }

      setDone({
        trackingId: data.tracking_id,
        bookingId: data.id,
        due: Math.max(0, computedTotal - (adminMode ? advNum : 0)),
      });
      toast.success(bn ? "আবেদন জমা হয়েছে!" : "Application submitted!");
      reset();
      onSubmitted?.();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || (bn ? "জমা দিতে ব্যর্থ" : "Submission failed"));
    } finally {
      setSubmitting(false);
    }
  };

  const Icon = isWorkPermit ? Briefcase : GraduationCap;
  const title = isWorkPermit
    ? (bn ? "ফিজি ওয়ার্ক পারমিটে আবেদন" : "Apply for Fiji Work Permit")
    : (bn ? "স্টুডেন্ট কনসালটেন্সি আবেদন" : "Student Consultancy Application");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        {done ? (
          <div className="text-center py-6 space-y-4">
            <CheckCircle className="h-16 w-16 text-primary mx-auto" />
            <DialogTitle className="font-heading text-2xl">
              {bn ? "আবেদন গৃহীত হয়েছে!" : "Application received!"}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {bn ? "আমাদের টিম শীঘ্রই যোগাযোগ করবে। আপনার ট্র্যাকিং আইডি:" : "Our team will contact you shortly. Your tracking ID:"}
            </p>
            <div className="flex items-center justify-center gap-2 bg-secondary rounded-lg p-3 font-mono text-lg font-bold text-primary">
              {done.trackingId}
              <button
                onClick={() => { navigator.clipboard.writeText(done.trackingId); toast.success("Copied"); }}
                className="text-muted-foreground hover:text-foreground"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <Link
                to={`/track?id=${done.trackingId}`}
                className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold"
                onClick={() => onOpenChange(false)}
              >
                {bn ? "ট্র্যাক করুন" : "Track Application"}
              </Link>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {bn ? "বন্ধ" : "Close"}
              </Button>
            </div>
            {!adminMode && done.due > 0 && (
              <div className="pt-3 border-t">
                <p className="text-xs text-muted-foreground mb-2">
                  {bn ? "চাইলে এখনই অনলাইনে অগ্রিম ফি প্রদান করতে পারেন:" : "Optionally pay your advance fee online now:"}
                </p>
                <PayOnlineButton
                  bookingId={done.bookingId}
                  trackingId={done.trackingId}
                  dueAmount={done.due}
                  customerName={fullName}
                  customerPhone={phone}
                  customerEmail={email}
                  className="w-full bg-gradient-ocean text-white hover:opacity-90"
                />
              </div>
            )}
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl bg-gradient-ocean text-white flex items-center justify-center">
                  <Icon className="h-5 w-5" />
                </div>
                <DialogTitle className="font-heading text-xl">{title}</DialogTitle>
              </div>
              <DialogDescription>
                {bn
                  ? "নিচের তথ্য পূরণ করুন। আমরা ২৪ ঘণ্টার মধ্যে যোগাযোগ করব।"
                  : "Fill in your details below. Our team will reach out within 24 hours."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-2">
              {adminMode && (
                <div className="pb-2 border-b">
                  <Label className="mb-1 block">{bn ? "বিদ্যমান কাস্টমার নির্বাচন (ঐচ্ছিক)" : "Select Existing Customer (optional)"}</Label>
                  <CustomerSearchSelect
                    selectedId={pickedCustomerId}
                    onSelect={(c) => {
                      if (!c) {
                        setPickedCustomerId(null);
                        return;
                      }
                      setPickedCustomerId(c.user_id);
                      setFullName(c.full_name || "");
                      setPhone(c.phone || "");
                      setEmail(c.email || "");
                      setAddress(c.address || "");
                      setPassport(c.passport_number || "");
                    }}
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{bn ? "পূর্ণ নাম *" : "Full Name *"}</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} />
                </div>
                <div>
                  <Label>{bn ? "ফোন *" : "Phone *"}</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" maxLength={20} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{bn ? "ইমেইল" : "Email"}</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} />
                </div>
                <div>
                  <Label>{bn ? "পাসপোর্ট নং" : "Passport No."}</Label>
                  <Input value={passport} onChange={(e) => setPassport(e.target.value)} maxLength={30} />
                </div>
              </div>
              <div>
                <Label>{bn ? "ঠিকানা" : "Address"}</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} maxLength={200} />
              </div>

              {isWorkPermit ? (
                <div className="space-y-3 pt-2 border-t">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label>{bn ? "যে পদে আবেদন *" : "Position Applying For *"}</Label>
                      <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="e.g. Diesel Mechanic" maxLength={80} />
                    </div>
                    <div>
                      <Label>{bn ? "অভিজ্ঞতা (বছর)" : "Experience (years)"}</Label>
                      <Input value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="e.g. 5" maxLength={10} />
                    </div>
                    <div>
                      <Label>{bn ? "বয়স" : "Age"}</Label>
                      <Input value={age} onChange={(e) => setAge(e.target.value)} placeholder="21–48" maxLength={3} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-2 border-t">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>{bn ? "যে দেশে যেতে চান" : "Destination Country"}</Label>
                      <Select value={country} onValueChange={setCountry}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>{bn ? "ডিগ্রি লেভেল" : "Study Level"}</Label>
                      <Select value={level} onValueChange={setLevel}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STUDY_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>{bn ? "প্রোগ্রাম/বিষয় *" : "Program / Subject *"}</Label>
                    <Input value={program} onChange={(e) => setProgram(e.target.value)} placeholder="e.g. MSc Computer Science" maxLength={120} />
                  </div>
                  <div>
                    <Label>{bn ? "সর্বশেষ শিক্ষাগত যোগ্যতা" : "Last Education"}</Label>
                    <Input value={lastEducation} onChange={(e) => setLastEducation(e.target.value)} placeholder="e.g. BSc Civil, 2024" maxLength={120} />
                  </div>
                </div>
              )}

              <div>
                <Label>{bn ? "অতিরিক্ত নোট" : "Additional Notes"}</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={500} />
              </div>

              {!adminMode && (
                <>
                  <div className="pt-2 border-t">
                    <DocumentUploadStep documents={uploadedDocs} onChange={setUploadedDocs} />
                  </div>
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs uppercase text-muted-foreground">
                          {bn ? "সার্ভিস ফি" : "Service Fee"}
                        </div>
                        <div className="font-bold text-lg text-primary">
                          {pkgInfo.price > 0
                            ? `৳${pkgInfo.price.toLocaleString("en-IN")}`
                            : (bn ? "যোগাযোগ করুন" : "Contact for pricing")}
                        </div>
                      </div>
                      <div className="text-[11px] text-muted-foreground text-right max-w-[55%]">
                        {bn
                          ? "সাবমিটের পর অনলাইনে পেমেন্ট অপশন পাবেন।"
                          : "After submission you can pay online instantly."}
                      </div>
                    </div>
                    {PAYMENT_METHODS.length > 0 && (
                      <div>
                        <div className="text-[11px] uppercase text-muted-foreground mb-1">
                          {bn ? "গৃহীত পেমেন্ট মাধ্যম" : "Accepted Payment Methods"}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {PAYMENT_METHODS.map((m) => (
                            <span
                              key={m.value}
                              className="px-2 py-0.5 rounded-full bg-background border text-[11px] font-medium"
                            >
                              {m.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {adminMode && (
                <div className="space-y-3 pt-3 border-t">
                  <div className="text-sm font-semibold">
                    {bn ? "পেমেন্ট তথ্য" : "Payment Details"}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>{bn ? "মোট প্যাকেজ মূল্য (৳)" : "Total Package Amount (৳)"}</Label>
                      <Input type="number" min="0" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} />
                    </div>
                    <div>
                      <Label>{bn ? "অগ্রিম প্রদান (৳)" : "Advance Paid (৳)"}</Label>
                      <Input type="number" min="0" value={advanceAmount} onChange={(e) => setAdvanceAmount(e.target.value)} />
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {bn ? "বাকি " : "Due: "}
                    <strong className="text-red-600">
                      ৳{Math.max(0, (Number(totalAmount) || 0) - (Number(advanceAmount) || 0)).toLocaleString("en-IN")}
                    </strong>
                  </div>
                  {Number(advanceAmount) > 0 && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>{bn ? "পেমেন্ট মাধ্যম" : "Payment Method"}</Label>
                          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>{bn ? "ওয়ালেট অ্যাকাউন্ট" : "Wallet Account"}</Label>
                          <Select value={walletId} onValueChange={setWalletId}>
                            <SelectTrigger><SelectValue placeholder="Select wallet" /></SelectTrigger>
                            <SelectContent>
                              {wallets.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label>{bn ? "ট্রানজ্যাকশন রেফ" : "Transaction Ref"}</Label>
                        <Input value={txnRef} onChange={(e) => setTxnRef(e.target.value)} placeholder={bn ? "ঐচ্ছিক" : "Optional"} />
                      </div>
                    </>
                  )}
                </div>
              )}

              <Button
                onClick={submit}
                disabled={submitting}
                className="w-full bg-gradient-ocean text-white hover:opacity-90"
                size="lg"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> :
                  (bn ? "আবেদন জমা দিন" : "Submit Application")}
              </Button>
              <p className="text-[11px] text-center text-muted-foreground">
                {bn
                  ? "জমা দিয়ে আপনি আমাদের শর্তাবলী মেনে নিচ্ছেন।"
                  : "By submitting, you agree to our terms & privacy policy."}
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ApplyDialog;
