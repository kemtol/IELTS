# Scenario Test 0004 - Generate Study Plan MVP

## 1. Informasi Umum
- Scenario ID: ST-PLAN-001
- Feature: Personalized Study Plan
- Prioritas: P0
- Tipe Test: Positive Flow
- Eksekusi: Manual (siap dikonversi ke automation)
- Referensi Dokumen: `_DOC/PRD.md` (sinkronisasi detail pending)

## 2. Tujuan
Memastikan sistem dapat membentuk study plan awal berdasarkan data onboarding dan baseline score placement test.

## 3. Cakupan
In scope:
- Trigger generate plan
- Menampilkan rencana belajar harian/mingguan
- Penyimpanan plan ke akun user

Out of scope:
- Optimasi plan berbasis performa jangka panjang
- Intervensi tutor manual
- Multi-goal planning

## 4. Preconditions
1. User sudah login.
2. Data onboarding user tersedia.
3. Placement test sudah completed.

## 5. Data Uji
| Field | Nilai |
|---|---|
| Target Score | 7.0 |
| Baseline Score | 5.5 (contoh) |
| Waktu Belajar | 60 menit/hari |
| Fokus Skill | Writing, Speaking |

## 6. Langkah Pengujian
| No | Langkah | Expected Result |
|---|---|---|
| 1 | Buka halaman `Study Plan` dari dashboard | Halaman plan terbuka |
| 2 | Klik `Generate Plan` / `Buat Rencana` | Sistem mulai memproses plan |
| 3 | Tunggu sampai proses selesai | Study plan tampil dengan ringkasan target |
| 4 | Verifikasi materi prioritas | Skill prioritas sesuai profil user |
| 5 | Verifikasi alokasi waktu | Durasi belajar sesuai preferensi onboarding |
| 6 | Refresh halaman plan | Plan yang sama tetap tampil (persisted) |

## 7. Acceptance Criteria
1. Study plan berhasil dibuat tanpa error.
2. Konten plan relevan dengan target dan baseline user.
3. Plan tersimpan dan dapat diakses ulang setelah refresh/relogin.
4. Tidak ada elemen kosong atau placeholder pada plan final.

## 8. Post-condition
- User memiliki study plan MVP yang aktif.
- User siap memulai sesi practice harian.

## 9. Catatan
- Saat PRD final tersedia, tambahkan validasi rule detail (misalnya distribusi skill per minggu).
