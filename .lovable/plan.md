
## Hasan Travels — Frontend Redesign + New Service Sections

### 1. Brand assets & theme

- Save uploaded logo as `src/assets/hasan-travels-logo.png` (replaces current placeholder) and a white-background favicon variant in `public/`.
- Sample logo colors and update design tokens in `src/index.css` + `tailwind.config.ts`:
  - **Primary** — Royal Blue `hsl(222 70% 35%)` (HASAN wordmark)
  - **Accent** — Vibrant Red `hsl(354 80% 52%)` (plane + triangles)
  - **Foreground** — Charcoal `hsl(0 0% 12%)` (TRAVELS text)
  - Light mode default; harmonized dark mode.
- Wire the logo into Navbar, Footer, Hero, Auth, PDF header, OG image meta.

### 2. Language defaults

- `src/i18n/LanguageContext.tsx` — `DEFAULT_LANG` already `"en"`; confirm and ensure language toggle still offers Bangla. Update all new strings in both `en` + `bn` dictionaries (`src/i18n/translations.ts`).

### 3. Frontend content (driven entirely by uploaded info)

Replace Hajj/Umrah-centric homepage with current Hasan Travels offerings:

**Hero** (`HeroSection.tsx`)
- Headline: "Work in Fiji — Legal Work Permit Visa from Bangladesh"
- Sub: "BMET-approved processing • 3-year permit • Salary 60,000–1,20,000 BDT + OT • Free company accommodation"
- Background: Fiji island/factory worker imagery (use uploaded `Services1.jpg` motif as inspiration; generate hero image via AI in build mode with red/blue brand palette).
- CTAs: "Apply Now" (WhatsApp deep-link `+8801322181500`) + "View Open Positions".
- Bilingual hero strapline ("ফিজিতে ওয়ার্ক পারমিট ভিসা").

**Services section** (`ServicesSection.tsx`) — 4 cards:
1. **Fiji Work Permit** (active, primary)
2. **Student Consultancy** (new — overseas study guidance)
3. **Hajj & Umrah** (badged "Coming Soon")
4. **Air Ticket & Visa Support** (general travel)

**Packages section** → repurpose as **Open Positions** grid built from `all_information.txt`. Categorized cards:
- Mechanical & Auto: Diesel Mechanic, Auto Electrician, Denting & Painting, MIG/TIG Welder, AC Technician, Hydraulic Mechanic, Heavy/Truck Driver, Motor Coil Winder
- Construction & Civil: Mason, Construction Foreman, Finishing Carpenter, PVC Installer, QS/Estimator/Draftsman
- Industrial: Industrial Electrician, Electrical Box Welder, Lathe Operator, Solar Panel Salesman
- Garments & Office: Sewing Operator/Mechanic/Supervisor, Embroidery Man, Graphic Designer, Senior Accountant, Office Staff (Female), Computer Operator, Warehouse Supervisor, Sales & Marketing
Each card: position name (EN+BN), salary range (BDT), category icon, "Apply via WhatsApp" button.

**Why Hasan Travels (Facilities)** — 6 trust badges:
- BMET-approved legal process
- Govt. Recruiting Licence (display "RL" badge — placeholder, user can update)
- Free company accommodation
- 3-year renewable permit
- Visa processing in 3–4 months
- 8h duty + overtime

**Process / Guidelines** — 5-step timeline: Submit CV + Work Video + Passport + White-bg photo → Delegate Interview → Selection → Visa Processing (3–4 months) → Fly to Fiji.

**About** — Rewrite for Hasan Travels: trusted Bangladesh-based travel & manpower agency; current focus Fiji Work Permit + Student Consultancy; expanding into Hajj, Umrah, and overseas education.

**Student Consultancy section** (new component `StudentConsultancySection.tsx`) — countries served (placeholder list), services offered (admission guidance, SOP, visa filing, accommodation), CTA to consultation form.

**Gallery** — replace with uploaded Fiji recruitment posters as gallery items.

**Testimonials** — neutral placeholders ("To be added") so old data is gone.

**Contact** (`ContactSection.tsx` + `Footer.tsx`):
- Address: Aziz Square, Lift-5, 67/7 Rabindra Sarani, Sector-07, Uttara, Dhaka-1230, Bangladesh
- WhatsApp/Imo: +880 1322-181500
- Email: info@hasantravelsbd.com
- Web: hasantravelsbd.com
- Embed Google Map for the Uttara address.

**SEO** (`SEOHead.tsx`, `index.html`, sitemap) — title/description/keywords centered on "Hasan Travels • Fiji Work Permit • Student Consultancy • BMET".

### 4. New admin panel sections (backend preserved)

Add two new admin pages (sidebar entries, routes in `App.tsx`):

1. **Work Permit Management** (`/admin/work-permit`)
   - CRUD for **Job Positions**: title (EN/BN), category, salary range, requirements, status (open/closed), interview date, country (default Fiji).
   - CRUD for **Applications**: applicant name, phone, position applied, CV/passport/work-video URLs, status (new/shortlisted/interviewed/selected/visa-processing/deployed/rejected), notes.
   - Public application form on the website posts here.

2. **Student Consultancy Management** (`/admin/student-consultancy`)
   - CRUD for **Study Programs**: country, university, course, duration, tuition range, intake.
   - CRUD for **Consultations**: student name, phone, email, target country, current education, status pipeline, notes.

DB migration adds 4 new tables (`job_positions`, `work_permit_applications`, `study_programs`, `student_consultations`) with RLS: admin-write via existing `has_role`, public can `INSERT` only into the two application tables.

Existing backend (bookings, payments, moallems, hotels, accounting, CMS, etc.) is **untouched** — Hajj/Umrah modules stay ready for future activation.

### 5. Cleanup of old content

- Remove Trip-Tastic / Manasik gallery photos and demo testimonials from public site (already DB-wiped).
- Hide `PackagesSection`/`HotelsSection`/`MoallemsSection`-style public pages from main nav until Hajj/Umrah goes live (toggleable via existing CMS section visibility).
- Public nav: Home • Services • Open Positions • Student Consultancy • About • Contact.

### Technical notes

```text
Files added
  src/components/StudentConsultancySection.tsx
  src/components/PositionCard.tsx
  src/components/ProcessTimeline.tsx
  src/pages/admin/AdminWorkPermitPage.tsx
  src/pages/admin/AdminStudentConsultancyPage.tsx
  supabase/migrations/<ts>_hasan_travels_services.sql
  src/assets/hasan-travels-logo.png  (from upload)
  src/assets/hero-fiji.jpg           (AI-generated, brand palette)

Files edited
  src/index.css, tailwind.config.ts (brand tokens)
  src/i18n/translations.ts (en+bn keys for new sections)
  src/components/{HeroSection,ServicesSection,PackagesSection,FacilitiesSection,
                  AboutSection,ContactSection,Footer,Navbar,SEOHead}.tsx
  src/pages/{Index,About,Contact}.tsx
  src/components/admin/AdminSidebar.tsx, src/App.tsx (routes)
  index.html, public/sitemap.xml, public/robots.txt
```

Color tokens stay HSL semantic; no hardcoded hex in components. All new copy bilingual (EN primary). Lovable preview will render the public site immediately after the build (admin pages require VPS API for live data, but UI shells will preview fine).

### Ready to implement on approval

On approval I will: copy the logo asset, write the migration, build all new components + admin pages, swap homepage content, apply the red/blue theme, and you'll see the redesigned site in Lovable preview.
