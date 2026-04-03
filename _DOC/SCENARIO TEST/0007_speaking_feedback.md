# Scenario Test 0007 - Speaking Submission & AI Feedback

## 1. Informasi Umum
- Scenario ID: ST-SPK-001
- Feature: Speaking Practice + AI Feedback
- Prioritas: P0
- Tipe Test: Positive Flow
- Eksekusi: Manual (siap dikonversi ke automation)
- Referensi Dokumen: `_DOC/PRD.md` (sinkronisasi detail pending)

## 2. Tujuan
Memastikan user dapat merekam/unggah jawaban speaking dan menerima feedback AI yang relevan untuk improvement.

## 3. Cakupan
In scope:
- Memulai sesi speaking
- Merekam audio jawaban
- Submit audio dan menerima feedback

Out of scope:
- Penilaian aksen regional mendalam
- Live speaking interview simulation
- Noise cancellation advanced tuning

## 4. Preconditions
1. User sudah login.
2. Izin mikrofon di browser/aplikasi sudah diberikan.
3. Service transkripsi dan AI feedback aktif.

## 5. Data Uji
| Field | Nilai |
|---|---|
| Prompt Speaking | IELTS speaking prompt (MVP) |
| Durasi rekaman | 60-120 detik |
| Format audio | Default app/browser recorder |

## 6. Langkah Pengujian
| No | Langkah | Expected Result |
|---|---|---|
| 1 | Buka task speaking | Halaman speaking task tampil |
| 2 | Klik `Start Recording` | Perekaman dimulai, timer berjalan |
| 3 | Rekam jawaban 60-120 detik lalu `Stop` | Preview audio dapat diputar |
| 4 | Klik `Submit` | Audio dikirim untuk diproses |
| 5 | Tunggu hasil feedback | Skor speaking + feedback ditampilkan |
| 6 | Kembali ke task list | Task speaking berstatus completed/reviewed |

## 7. Acceptance Criteria
1. Rekaman audio berhasil dibuat tanpa error akses mikrofon.
2. Submit audio berhasil dan feedback muncul maksimal 20 detik.
3. Feedback minimal mencakup skor dan saran improvement.
4. Hasil speaking tersimpan di histori user.

## 8. Post-condition
- Attempt speaking tercatat pada akun user.
- Data score speaking siap dipakai untuk update progres.

## 9. Catatan
- Jika PRD final mengatur batas ukuran audio, tambahkan validasi ukuran file di test step.
