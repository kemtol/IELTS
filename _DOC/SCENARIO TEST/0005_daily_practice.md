# Scenario Test 0005 - Daily Practice Session

## 1. Informasi Umum
- Scenario ID: ST-PRC-001
- Feature: Daily Practice
- Prioritas: P0
- Tipe Test: Positive Flow
- Eksekusi: Manual (siap dikonversi ke automation)
- Referensi Dokumen: `_DOC/PRD.md` (sinkronisasi detail pending)

## 2. Tujuan
Memastikan user dapat memulai sesi latihan harian, menyelesaikan task, dan status progres sesi tercatat.

## 3. Cakupan
In scope:
- Memulai sesi practice dari plan
- Menyelesaikan task latihan
- Mark progress/completion

Out of scope:
- Random challenge event
- Gamification kompleks (streak reward lanjutan)
- Mode offline

## 4. Preconditions
1. User sudah login.
2. User memiliki study plan aktif.
3. Task practice tersedia untuk hari berjalan.

## 5. Data Uji
| Field | Nilai |
|---|---|
| Tanggal sesi | Hari ini |
| Jumlah task | 3 task (contoh MVP) |
| Jenis task | Reading, Writing, Speaking |

## 6. Langkah Pengujian
| No | Langkah | Expected Result |
|---|---|---|
| 1 | Buka menu `Today Plan` / `Daily Practice` | Daftar task hari ini tampil |
| 2 | Klik task pertama untuk memulai | Halaman task terbuka |
| 3 | Kerjakan task sampai selesai | Jawaban tersimpan dan status task completed |
| 4 | Ulangi pada task kedua dan ketiga | Semua task dapat diselesaikan |
| 5 | Kembali ke ringkasan daily practice | Progress bar/summary menunjukkan completion sesuai task selesai |
| 6 | Refresh halaman | Status completion tetap tersimpan |

## 7. Acceptance Criteria
1. Semua task harian dapat dibuka dan diselesaikan.
2. Status completion tiap task berubah real-time setelah submit.
3. Ringkasan progres harian akurat dan persisten.
4. Tidak ada crash/error blocking di tengah sesi.

## 8. Post-condition
- Progress harian user meningkat sesuai jumlah task selesai.
- Data siap digunakan untuk evaluasi feedback dan dashboard.

## 9. Catatan
- Detail jenis task dan rule completion final mengikuti PRD final.
