# Scenario Test 0006 - Writing Submission & AI Feedback

## 1. Informasi Umum
- Scenario ID: ST-WRT-001
- Feature: Writing Practice + AI Feedback
- Prioritas: P0
- Tipe Test: Positive Flow
- Eksekusi: Manual (siap dikonversi ke automation)
- Referensi Dokumen: `_DOC/PRD.md` (sinkronisasi detail pending)

## 2. Tujuan
Memastikan user dapat submit jawaban writing dan menerima feedback AI yang mencakup skor serta saran perbaikan.

## 3. Cakupan
In scope:
- Input jawaban writing
- Submit jawaban
- Menampilkan skor/feedback

Out of scope:
- Re-score by human examiner
- Advanced plagiarism detection
- Export hasil ke PDF

## 4. Preconditions
1. User sudah login.
2. User memiliki task writing aktif.
3. Service AI feedback berjalan normal.

## 5. Data Uji
| Field | Nilai |
|---|---|
| Prompt Writing | IELTS Task sample (MVP) |
| Panjang jawaban | >= 150 kata |
| Bahasa | English |

## 6. Langkah Pengujian
| No | Langkah | Expected Result |
|---|---|---|
| 1 | Buka task writing dari daily practice | Editor writing tampil |
| 2 | Isi jawaban minimal 150 kata | Counter kata/validasi bekerja |
| 3 | Klik `Submit` | Sistem memproses jawaban |
| 4 | Tunggu hasil feedback | Skor writing tampil |
| 5 | Tinjau feedback detail | Sistem menampilkan poin kekuatan dan area perbaikan |
| 6 | Kembali ke halaman task list | Task writing berstatus completed/reviewed |

## 7. Acceptance Criteria
1. Jawaban writing dapat disubmit sekali tanpa error.
2. Feedback dan skor muncul maksimal 15 detik setelah submit.
3. Feedback mengandung minimal: skor total dan saran perbaikan.
4. Riwayat hasil writing tersimpan di akun user.

## 8. Post-condition
- Attempt writing tercatat sebagai histori.
- Skor writing terbaru tersedia untuk progress dashboard.

## 9. Catatan
- Struktur rubric feedback bisa diperkaya setelah requirement final PRD tersedia.
