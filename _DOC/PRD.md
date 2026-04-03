# IELTS Sprint — Product Requirements Document
**MVP v1.0 | Status: Draft — Ready for Build | April 2026**

| | |
|---|---|
| **Model Bisnis** | Rp 5.000/hari × 1.000 user |
| **Target MRR** | Rp 150.000.000/bulan |
| **Target Launch** | 6 minggu dari kickoff |

---

## 1. Executive Summary

> IELTS Sprint adalah platform latihan IELTS harian berbasis AI untuk pasar Indonesia. User mendaftar dengan tanggal ujian mereka, lalu mendapat 1 sesi latihan terfokus per hari dengan feedback AI dalam Bahasa Indonesia — seharga Rp 5.000/hari.
>
> **Framing:** "Kamu sudah bayar Rp 3 juta untuk ujian IELTS. Rp 5.000/hari untuk persiapan yang optimal adalah investasi terkecil yang bisa kamu buat."

Platform ini bukan sekadar bank soal IELTS online. Diferensiasi utama:

- **AI-generated passages dan soal infinite** — tidak pernah kehabisan soal baru
- **Penjelasan jawaban dalam Bahasa Indonesia** — belum ada kompetitor yang melakukan ini
- **Progress tracking** berbasis band score estimasi per question type
- **Urgency loop built-in:** countdown timer ke tanggal ujian user
- **Delivery via web app** mobile-friendly, tidak butuh install

---

## 2. Problem Statement

### 2.1 Pain Point Utama

Setiap tahun ratusan ribu orang Indonesia mengikuti IELTS untuk beasiswa (LPDP, Chevening, Australia Awards), studi luar negeri, dan imigrasi. Biaya ujian Rp 3.100.000–3.500.000 per attempt. Mayoritas test-taker menghadapi masalah yang sama:

| Problem | Impact | Root Cause |
|---|---|---|
| Soal latihan cepat habis | Beli buku tebal Rp 300k+ | Sumber gratis online terbatas |
| Penjelasan jawaban dalam English | Tidak paham kenapa salah | Semua platform global = English |
| Tidak tahu harus fokus latihan apa | Waktu belajar tidak efisien | Tidak ada adaptive learning lokal |
| Biaya kursus IELTS mahal | Rp 3–8 juta untuk 1 course | Barrier tinggi untuk banyak orang |
| Tidak ada struktur harian | Belajar sporadis, tidak konsisten | Tidak ada accountability system |

### 2.2 Target User

**Persona Primer: "Rizky"**
Mahasiswa S1/S2, 21–28 tahun, sedang apply beasiswa LPDP atau program studi luar negeri. Sudah booking ujian IELTS dalam 30–60 hari. Punya waktu 1–2 jam per hari untuk belajar. Budget terbatas — tidak mampu kursus intensif Rp 5 juta.

**Persona Sekunder: "Dewi"**
Profesional 28–35 tahun yang apply ke program imigrasi atau kerja di luar negeri. Punya income, tapi tidak ada waktu ikut kursus. Mau yang bisa dilakukan 30 menit per hari dari mana saja.

---

## 3. Solution Overview

### 3.1 Konsep Produk

IELTS Sprint adalah program 30 hari terstruktur. User tidak "berlangganan platform" — mereka **"join program sprint menuju ujian mereka."** Framing ini krusial karena menciptakan commitment dan urgency yang berbeda dari subscription biasa.

> **Tagline:** "30 hari, 30 menit per hari, 1 sesi AI-powered — Rp 5.000/hari. Lebih murah dari segelas kopi, lebih berharga dari ribuan jam latihan tanpa arah."

### 3.2 Core User Flow

1. User mendaftar, input tanggal ujian IELTS mereka
2. Pilih paket: 15 hari (Rp 75k), 30 hari (Rp 150k), atau 45 hari (Rp 225k) — bayar di muka via Xendit/Midtrans
3. Setiap hari, platform generate 1 sesi latihan baru yang belum pernah ada sebelumnya
4. User kerjakan soal dengan timer (simulasi kondisi ujian real)
5. Submit → Claude API generate penjelasan per soal dalam Bahasa Indonesia
6. Band score estimasi diupdate, progress chart diperbarui
7. Day streak dan countdown ke ujian muncul di dashboard
8. Hari ke-30: summary report + rekomendasi focus area untuk sisa waktu persiapan

### 3.3 MVP Scope — IELTS Reading Only

> **Keputusan strategis:** MVP hanya Reading. Alasan: (1) Reading paling mudah di-automate dengan AI, (2) tidak butuh audio processing seperti Listening, (3) tidak butuh human grader seperti Writing/Speaking, (4) Reading adalah section dengan tipe soal paling beragam — bisa showcase AI capability dengan baik.

---

## 4. Feature Requirements

### 4.1 Feature List dengan Priority

| Feature | Release | Effort |
|---|---|---|
| Onboarding: input tanggal ujian + level awal | MVP | S |
| Payment gateway (Xendit — transfer bank, e-wallet, QRIS) | MVP | M |
| AI passage generation (IELTS Academic style) | MVP | L |
| Soal generation: 5 tipe utama per sesi | MVP | L |
| Timer per sesi (60 menit simulasi) | MVP | S |
| Auto-grading jawaban objective | MVP | M |
| AI explanation per soal dalam Bahasa Indonesia | MVP | L |
| Band score estimasi per sesi | MVP | M |
| Progress dashboard + day streak | MVP | M |
| Countdown ke tanggal ujian | MVP | S |
| Daily reminder via email/WhatsApp | MVP | M |
| Adaptive difficulty (harder if score naik) | v2 | L |
| IELTS Listening module | v2 | XL |
| IELTS Writing module + AI grader | v2 | XL |
| Mock test full (Reading + Listening + Writing) | v2 | XL |
| Vocabulary tracker dari soal yang dikerjakan | v2 | M |
| Referral program (invite 3 teman = 1 hari gratis) | v2 | S |

*Effort: S = 1–2 hari, M = 3–5 hari, L = 1–2 minggu, XL = 2+ minggu*

### 4.2 Detail: AI Passage Generation

Ini adalah jantung produk. Claude API akan generate IELTS Academic-style passage dengan constraints:

- Panjang: 700–900 kata
- Topik: berputar antara academic topics (sains, sejarah, sosial, lingkungan, teknologi)
- Vocabulary level: C1–C2 (sesuai IELTS Academic)
- Tidak mengulang topik yang sama dalam 7 hari terakhir untuk user tersebut
- Passage harus mengandung: argumentasi, data/angka, referensi akademik imajiner

Setiap passage di-generate fresh per user per hari — tidak ada 2 user yang mendapat soal yang sama. Ini juga eliminasi risiko soal bocor/sharing di komunitas.

### 4.3 Detail: Question Types (MVP)

| Question Type | Jumlah/Sesi | Bobot Band Score |
|---|---|---|
| True / False / Not Given | 3–4 soal | High |
| Matching Headings | 3–4 soal | High |
| Fill in the Blanks | 3–4 soal | Medium |
| Multiple Choice | 2–3 soal | Medium |
| Short Answer Questions | 2–3 soal | Medium |

**Total per sesi: 13–18 soal** (disesuaikan dengan kondisi ujian real)

### 4.4 Detail: AI Explanation (Differentiator Utama)

Setelah user submit jawaban, Claude API di-call dengan: passage + semua soal + jawaban user + jawaban benar.

**Output per soal (dalam Bahasa Indonesia):**
1. Kenapa jawaban user salah/benar
2. Di mana lokasi evidence dalam passage (kutip kalimat kunci)
3. Common trap yang sering menjebak test-taker Indo
4. Tip strategi untuk soal tipe ini ke depannya

---

## 5. Tech Stack & Architecture

### 5.1 Stack yang Dipilih

| Layer | Technology | Alasan |
|---|---|---|
| Frontend | Next.js 14 + Tailwind CSS | SSR untuk SEO, file-based routing simpel |
| Backend | Python FastAPI | Familiar, async support bagus |
| AI Engine | Claude Haiku (`claude-haiku-4-5`) | Cepat, murah, cukup powerful untuk task ini |
| Database | Supabase (PostgreSQL) | Auth built-in, realtime, free tier cukup untuk MVP |
| Payment | Xendit | Support semua payment method Indo, sandbox gratis |
| Hosting | Vercel (frontend) + Railway (backend) | Free tier cukup, deploy dari Git push |
| Email/WA | Resend (email) + WhatsApp Cloud API | Reliable, cheap, mudah setup |

### 5.2 Database Schema (Core Tables)

```sql
-- Users
users (
  id          uuid PRIMARY KEY,
  email       text UNIQUE NOT NULL,
  nama        text,
  tanggal_ujian date,
  level_awal  text,  -- 'beginner' | 'intermediate' | 'advanced'
  created_at  timestamptz DEFAULT now()
)

-- Subscriptions
subscriptions (
  id          uuid PRIMARY KEY,
  user_id     uuid REFERENCES users(id),
  paket       int,   -- 15 | 30 | 45 (hari)
  start_date  date,
  end_date    date,
  status      text,  -- 'active' | 'expired' | 'paused'
  payment_id  text,  -- Xendit payment reference
  created_at  timestamptz DEFAULT now()
)

-- Sessions (1 per hari per user)
sessions (
  id          uuid PRIMARY KEY,
  user_id     uuid REFERENCES users(id),
  hari_ke     int,
  passage     text,
  questions   jsonb,
  completed_at timestamptz,
  created_at  timestamptz DEFAULT now()
)

-- Answers
answers (
  id              uuid PRIMARY KEY,
  session_id      uuid REFERENCES sessions(id),
  question_index  int,
  user_answer     text,
  is_correct      boolean,
  explanation     text,
  created_at      timestamptz DEFAULT now()
)

-- Progress (1 row per user per hari)
progress (
  id                  uuid PRIMARY KEY,
  user_id             uuid REFERENCES users(id),
  date                date,
  band_score_estimasi float,
  accuracy_pct        float,
  questions_attempted int,
  created_at          timestamptz DEFAULT now()
)
```

### 5.3 Claude API Integration

Dua API call per sesi:

**Call 1 — Generate** (saat sesi dimulai)
- Input: instruksi passage IELTS + topik hari ini + history topik user
- Output: passage + 13–18 soal dalam format JSON
- Estimasi: ~2.000 input token + ~1.500 output token = ~3.500 token

**Call 2 — Explain** (setelah user submit)
- Input: passage + semua soal + jawaban user
- Output: array penjelasan per soal dalam Bahasa Indonesia
- Estimasi: ~3.000 input token + ~2.000 output token = ~5.000 token

> **Cost per user per hari:** ~8.500 token × Haiku rate ($0.25/1M input, $1.25/1M output) ≈ $0.004 = **Rp ~65/hari**
> **Revenue per user per hari:** Rp 5.000
> **Gross margin dari AI cost saja: 98.7%**

---

## 6. Business Model & Unit Economics

### 6.1 Pricing Structure

| Paket | Harga Total | Per Hari |
|---|---|---|
| Sprint 15 Hari | Rp 75.000 | Rp 5.000 |
| Sprint 30 Hari *(Best Value)* | Rp 150.000 | Rp 5.000 |
| Sprint 45 Hari | Rp 225.000 | Rp 5.000 |

Semua paket **bayar di muka** (bukan auto-renew harian). Ini eliminasi churn harian dan friction payment. User yang selesai sprint dan mau lanjut, beli paket baru.

### 6.2 Unit Economics

| Metric | Conservative | Target |
|---|---|---|
| Harga per sprint (30 hari) | Rp 150.000 | Rp 150.000 |
| AI cost per user per sprint | Rp 1.950 | Rp 1.950 |
| Infra cost per user | Rp 2.000 | Rp 2.000 |
| **Gross profit per user per sprint** | **Rp 146.050** | **Rp 146.050** |
| Gross margin | 97.4% | 97.4% |
| User aktif target bulan 3 | 200 users | 500 users |
| MRR bulan 3 | Rp 30.000.000 | Rp 75.000.000 |
| User aktif target bulan 6 | 600 users | 1.500 users |
| MRR bulan 6 | Rp 90.000.000 | Rp 225.000.000 |

### 6.3 Acquisition Strategy

**Organic — SEO (Utama)**
- Target keyword: "latihan IELTS reading gratis", "soal IELTS reading online", "cara belajar IELTS mandiri"
- Buat 10–15 artikel SEO tentang IELTS prep dalam Bahasa Indonesia sebelum launch
- Setiap session yang di-generate bisa jadi landing page terindeks (dengan consent user)

**Community — Beasiswa Groups (Cepat)**
- Post di grup LPDP, Chevening, Australia Awards di Facebook/Telegram — ratusan ribu member
- Testimonial dari user pertama yang band score-nya naik — ini akan viral secara organik
- Partner dengan akun Instagram/TikTok tips IELTS (micro-influencer 10k–50k followers)

**Referral (Viral Loop)**
- "Invite 1 teman yang daftar → dapat 3 hari gratis" — simple, tidak perlu kode promo
- Share hasil band score estimasi ke Twitter/LinkedIn — CTA: "Coba sprint kamu di [link]"

---

## 7. MVP Build Roadmap — 6 Minggu

| Minggu | Focus | Deliverable |
|---|---|---|
| 1 | Core AI engine | Claude API generate passage + soal JSON. Prompt engineering untuk IELTS Academic style. Test kualitas output manual. |
| 2 | Frontend — session flow | Form onboarding, halaman session (baca passage + jawab soal + timer), halaman hasil + penjelasan. Belum ada auth. |
| 3 | Auth + database | Supabase auth (email + Google OAuth), schema DB lengkap, simpan session history, progress tracking basic. |
| 4 | Payment + subscription | Xendit integration, 3 pilihan paket, gating konten berdasarkan status subscription, halaman konfirmasi pembayaran. |
| 5 | Dashboard + notifications | Progress chart, band score tracker, day streak, countdown ke ujian, daily reminder via email (Resend). |
| 6 | Polish + launch | Landing page SEO-optimized, mobile responsiveness, soft launch ke komunitas LPDP, monitoring error via Sentry. |

### 7.1 Success Metrics per Milestone

| Milestone | Metric | Target |
|---|---|---|
| End Week 2 | AI output quality | 80% passage lolos review manual |
| End Week 4 | Payment flow | Test transaction berhasil end-to-end |
| Launch Week 6 | Registered users | 100 users dalam 7 hari pertama |
| Month 2 | Paying users | 200 paying users |
| Month 3 | Retention | 60% user beli sprint kedua setelah selesai |
| Month 6 | MRR | Rp 75.000.000/bulan |

---

## 8. Risks & Mitigations

| Risk | Probability | Mitigation |
|---|---|---|
| AI output kualitas rendah (passage tidak IELTS-level) | Medium | Prompt engineering intensif + human review 50 soal sebelum launch. Bangun rubric evaluasi. |
| User tidak mau bayar di muka (prefer daily) | Medium | Test A/B: paket 7 hari Rp 35k sebagai entry point. Framing "program", bukan "subscription". |
| Copyright: IELTS brand tidak boleh digunakan komersial | **High** | Gunakan nama "Sprint Reading" atau "Band Up" — tidak menyebut IELTS sebagai bagian nama produk. Disclaimer: *not affiliated with British Council/IDP.* |
| Claude API downtime atau rate limit | Low | Implement retry logic + fallback ke pre-generated passage bank (siapkan 50 passage statis untuk emergency). |
| Soal di-screenshot dan disebarkan | Medium | Watermark invisible di passage. Soal di-generate fresh per user — soal yang disebarkan jadi tidak relevan untuk orang lain. |
| Kompetitor (KarirFair, Dealls) pivot ke IELTS prep | Low | Mereka fokus ke job portal. Kalau terjadi: keunggulan lo adalah AI explanation BI + daily sprint structure yang mereka tidak punya. |

---

## 9. Open Questions

- **Nama brand:** "IELTS Sprint" kemungkinan tidak bisa di-trademark karena mengandung nama ujian. Alternatif: `BandUp`, `SprintEng`, `ReadyBand`, `Uji.ai`
- **WhatsApp reminder:** butuh WhatsApp Business API yang perlu approval Meta. Alternatif sementara: Telegram bot yang lebih mudah di-setup.
- **General Training vs Academic:** MVP fokus Academic dulu (lebih banyak test-taker). General Training tambah di v2.
- **Refund policy:** kalau user tidak bisa selesai sprint (sakit, dll), apakah ada extension? Rekomendasi: 1x extension gratis per paket.
- **Pricing Rupiah vs USD:** semua dalam Rupiah. Kalau mau expand ke Malaysia/Vietnam di v2, pertimbangkan multi-currency.

---

## 10. Appendix: Sample Claude Prompts

### Prompt 1 — Generate Passage + Soal

```
SYSTEM:
You are an expert IELTS Academic Reading passage writer.
Generate a passage and questions following strict IELTS Academic standards.

USER:
Generate a new IELTS Academic Reading passage on the topic of [TOPIC].

Requirements:
- Length: 750–850 words
- Tone: academic, formal
- Must include specific data points, statistics, and imaginary academic references
- Appropriate for Band 6–8 candidates

Then generate exactly 13 questions in this distribution:
- 4 True / False / Not Given
- 3 Matching Headings
- 3 Fill in the Blanks
- 2 Multiple Choice
- 1 Short Answer

Return as structured JSON:
{
  "passage": "...",
  "title": "...",
  "topic": "...",
  "questions": [
    {
      "type": "tfng | matching | fill | mcq | short",
      "question": "...",
      "options": [...],  // for MCQ only
      "answer": "...",
      "answer_location": "paragraph 2, sentence 3"
    }
  ]
}

Topics already used this week for this user: [USED_TOPICS]
Do NOT repeat these topics.
```

### Prompt 2 — Generate Penjelasan dalam Bahasa Indonesia

```
SYSTEM:
You are an expert IELTS tutor who explains answers
in clear, encouraging Bahasa Indonesia.

USER:
Berikut adalah soal IELTS Reading yang baru saja dikerjakan user.
Untuk setiap soal, berikan penjelasan dalam Bahasa Indonesia yang mencakup:
1. Kenapa jawaban yang benar adalah benar
2. Di mana letak evidence-nya dalam passage
   (sebutkan paragraf dan kutip kalimat kuncinya)
3. Kenapa jawaban user salah jika user salah (jelaskan trap-nya)
4. Tip strategi untuk soal tipe ini ke depannya

Gunakan bahasa yang encouraging dan tidak menghakimi.
Maksimal 150 kata per soal.

Return sebagai JSON array:
[
  {
    "question_index": 0,
    "is_correct": true,
    "explanation": "..."
  }
]

[PASSAGE]
[QUESTIONS_AND_ANSWERS]
```

---

*IELTS Sprint PRD — Confidential | Solo Founder Build | April 2026*

