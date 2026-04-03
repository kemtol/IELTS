# Scenario Test 0003 - Placement Test Awal

## 1. Informasi Umum
- Scenario ID: ST-PLT-001
- Feature: Placement Test / Initial Assessment
- Prioritas: P0
- Tipe Test: Positive Flow (End-to-End)
- Eksekusi: Manual (siap dikonversi ke automation)
- Referensi Dokumen: `_DOC/PRD.md` (sinkronisasi detail pending)

## 2. Tujuan
Memastikan user dapat menyelesaikan placement test awal dan sistem menghasilkan baseline score untuk personalisasi materi belajar.

## 3. Cakupan
In scope:
- Memulai placement test
- Menjawab seluruh soal sampai submit
- Menampilkan hasil baseline score

Out of scope:
- Adaptive test level lanjutan
- Band score breakdown kompleks per sub-skill
- Re-take policy detail

## 4. Preconditions
1. User sudah login.
2. User belum pernah menyelesaikan placement test pada akun test ini.
3. Bank soal assessment tersedia.

## 5. Data Uji
| Field | Nilai |
|---|---|
| Jumlah soal | 10 (contoh MVP) |
| Pola jawaban | Campuran benar/salah |
| Durasi pengerjaan | <= 20 menit |

## 6. Langkah Pengujian
| No | Langkah | Expected Result |
|---|---|---|
| 1 | Dari dashboard, pilih menu `Placement Test` | Halaman intro placement test tampil |
| 2 | Klik `Mulai Test` | Soal pertama ditampilkan |
| 3 | Jawab soal 1 sampai soal terakhir | Navigasi soal berjalan tanpa error |
| 4 | Klik `Submit` di akhir test | Sistem meminta konfirmasi submit |
| 5 | Konfirmasi submit | Jawaban diproses dan test ditandai selesai |
| 6 | Lihat halaman hasil | Baseline score ditampilkan |
| 7 | Kembali ke dashboard | Dashboard menampilkan status placement test completed |

## 7. Acceptance Criteria
1. Semua soal dapat diakses dan dijawab.
2. Submit hanya bisa dilakukan setelah requirement minimum jawaban terpenuhi.
3. Baseline score muncul maksimal 10 detik setelah submit.
4. Status completion tersimpan setelah refresh/relogin.

## 8. Post-condition
- Akun memiliki baseline score awal.
- Data siap dipakai untuk rekomendasi materi/study plan.

## 9. Catatan
- Angka jumlah soal dan SLA proses score dapat disesuaikan saat PRD final tersedia.
