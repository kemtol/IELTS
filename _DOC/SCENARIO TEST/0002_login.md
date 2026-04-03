# Scenario Test 0002 - Login Existing User

## 1. Informasi Umum
- Scenario ID: ST-AUTH-001
- Feature: Login User Existing
- Prioritas: P0
- Tipe Test: Positive Flow
- Eksekusi: Manual (siap dikonversi ke automation)
- Referensi Dokumen: `_DOC/PRD.md` (sinkronisasi detail pending)

## 2. Tujuan
Memastikan user yang sudah terdaftar dapat login dengan kredensial valid dan masuk ke dashboard tanpa kehilangan data onboarding.

## 3. Cakupan
In scope:
- Login dengan email dan password
- Redirect setelah login
- Session persistence basic

Out of scope:
- Login via Google/Apple
- Multi-device session management
- Forgot password flow

## 4. Preconditions
1. User sudah memiliki akun aktif.
2. User sudah logout dari semua sesi browser saat test dimulai.
3. API autentikasi berjalan normal.

## 5. Data Uji
| Field | Nilai |
|---|---|
| Email | test.onboarding+001@example.com |
| Password | Test@12345 |

## 6. Langkah Pengujian
| No | Langkah | Expected Result |
|---|---|---|
| 1 | Buka halaman login | Form login tampil normal |
| 2 | Input email valid dan password valid | Input diterima tanpa error validasi |
| 3 | Klik tombol `Login` | Sistem memproses autentikasi |
| 4 | Tunggu proses login selesai | User diarahkan ke dashboard utama |
| 5 | Refresh halaman dashboard | User tetap login, tidak redirect ke login |
| 6 | Cek ringkasan profil awal | Data target IELTS/fokus skill tetap sesuai onboarding |

## 7. Acceptance Criteria
1. Login berhasil dalam <= 5 detik pada koneksi normal.
2. Tidak ada error autentikasi pada kredensial valid.
3. Session aktif setelah refresh.
4. Data profil user tidak berubah setelah login ulang.

## 8. Post-condition
- User berada pada kondisi login aktif.
- User siap menjalankan flow MVP berikutnya.

## 9. Catatan
- Untuk traceability final, tambahkan mapping Requirement ID dari PRD per langkah test.
