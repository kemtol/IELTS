# Scenario Test 0001 - Onboarding

## 1. Informasi Umum
- Scenario ID: ST-ONB-001
- Feature: Onboarding User Baru
- Prioritas: P0
- Tipe Test: Positive Flow (End-to-End)
- Eksekusi: Manual (siap dikonversi ke automation)
- Referensi Dokumen: `_DOC/PRD.md` (sinkronisasi detail pending)

## 2. Tujuan
Memastikan user baru dapat menyelesaikan flow onboarding dari halaman awal sampai masuk ke dashboard pertama, dan semua preferensi onboarding tersimpan dengan benar.

## 3. Cakupan
In scope:
- Registrasi akun baru
- Verifikasi akun (email/OTP)
- Pengisian preferensi awal belajar
- Selesai onboarding dan masuk halaman utama

Out of scope:
- Upgrade subscription atau pembayaran
- Migrasi akun lama
- Integrasi social login

## 4. Preconditions
1. User belum pernah terdaftar di sistem.
2. Layanan verifikasi (email/OTP) aktif.
3. Environment test dalam kondisi normal (API onboarding up).
4. Tidak ada sesi login aktif di browser/device.

## 5. Data Uji
| Field | Nilai |
|---|---|
| Nama | Test Onboarding |
| Email | test.onboarding+001@example.com |
| Password | Test@12345 |
| Target IELTS | 7.0 |
| Durasi Belajar | 60 menit/hari |
| Fokus Skill | Writing, Speaking |

## 6. Langkah Pengujian
| No | Langkah | Expected Result |
|---|---|---|
| 1 | Buka aplikasi/website sebagai user baru | Halaman welcome/landing tampil tanpa error |
| 2 | Klik tombol `Mulai` / `Get Started` | User diarahkan ke halaman registrasi |
| 3 | Isi form registrasi (nama, email, password) lalu submit | Validasi form lolos, akun dibuat, lanjut ke verifikasi |
| 4 | Masukkan kode verifikasi (OTP/link) valid | Verifikasi berhasil dan status akun menjadi aktif |
| 5 | Lanjut ke langkah set target IELTS | Halaman target belajar tampil |
| 6 | Pilih target score `7.0` | Nilai target tersimpan sementara dan dapat dilanjutkan |
| 7 | Pilih durasi belajar `60 menit/hari` | Preferensi durasi tersimpan sementara |
| 8 | Pilih fokus skill `Writing` dan `Speaking` | Preferensi skill tersimpan sementara |
| 9 | Klik `Lanjut` / `Selesai Onboarding` | Sistem memproses finalisasi tanpa error |
| 10 | Masuk ke dashboard pertama | Dashboard tampil dengan state user baru |
| 11 | Cek ringkasan profil/study plan awal | Target score, durasi, dan fokus skill sesuai input |
| 12 | Logout lalu login ulang | Data onboarding tetap tersimpan (persisted) |

## 7. Acceptance Criteria
1. Seluruh langkah pada section 6 berhasil tanpa blocker error.
2. User berhasil mencapai dashboard maksimal dalam 3 menit pada koneksi normal.
3. Tidak ada data onboarding yang hilang setelah relogin.
4. Tidak muncul error `5xx` atau error validasi yang tidak relevan.

## 8. Post-condition
- Akun baru aktif dan memiliki data preferensi onboarding.
- Data siap dipakai untuk skenario test berikutnya (misalnya: study plan dan progress tracking).

## 9. Catatan
- Dokumen ini dibuat sebagai draft format skenario test onboarding pertama.
- Mapping requirement per baris PRD belum bisa dilock karena file `_DOC/PRD.md` di repo saat ini masih kosong.
- Setelah PRD terisi, tambahkan kolom `Requirement ID` di tabel langkah agar traceability lengkap.
