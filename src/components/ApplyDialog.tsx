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

export type ApplyServiceType = "work_permit" | "student_consultancy";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  serviceType: ApplyServiceType;
  /** Pre-selected position (work permit) or program (student) */
  preset?: string;
}

const COUNTRIES = ["United Kingdom", "Canada", "Australia", "United States", "Germany", "Malaysia", "Other"];
const STUDY_LEVELS = ["Foundation", "Bachelor's", "Master's", "PhD", "Diploma"];

const ApplyDialog = ({ open, onOpenChange, serviceType, preset }: Props) => {
  const { language } = useLanguage();
  const bn = language === "bn";
  const isWorkPermit = serviceType === "work_permit";

  const [user, setUser] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ trackingId: string } | null>(null);

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

  useEffect(() => {
    if (!open) return;
    setDone(null);
    setPosition(preset || "");
    setProgram(preset || "");
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
  }, [open, preset]);

  const reset = () => {
    setFullName(""); setPhone(""); setEmail(""); setAddress(""); setPassport("");
    setPosition(""); setExperience(""); setAge("");
    setCountry(COUNTRIES[0]); setProgram(""); setLevel(STUDY_LEVELS[1]); setLastEducation("");
    setNotes("");
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
      // Find the service package
      const { data: pkg } = await supabase
        .from("packages").select("id").eq("type", serviceType).limit(1).maybeSingle();

      const application_data = isWorkPermit
        ? { position, experience, age, destination: "Fiji" }
        : { country, program, level, last_education: lastEducation };

      const payload: any = {
        package_id: pkg?.id || null,
        service_type: serviceType,
        application_data,
        user_id: user?.id || null,
        guest_name: fullName,
        guest_phone: phone,
        guest_email: email || null,
        guest_address: address || null,
        guest_passport: passport || null,
        num_travelers: 1,
        total_amount: 0,
        notes: notes || null,
        status: "pending",
        booking_type: "individual",
      };

      const { data, error } = await supabase
        .from("bookings").insert(payload).select("id, tracking_id").single();
      if (error) throw error;

      setDone({ trackingId: data.tracking_id });
      toast.success(bn ? "আবেদন জমা হয়েছে!" : "Application submitted!");
      reset();
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
