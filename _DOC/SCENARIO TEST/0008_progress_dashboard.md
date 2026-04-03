# Scenario Test 0008 - Progress Dashboard MVP

## 1. Informasi Umum
- Scenario ID: ST-PRG-001
- Feature: Progress Tracking Dashboard
- Prioritas: P0
- Tipe Test: Positive Flow
- Eksekusi: Manual (siap dikonversi ke automation)
- Referensi Dokumen: `_DOC/PRD.md` (sinkronisasi detail pending)

## 2. Tujuan
Memastikan dashboard progres menampilkan data aktivitas belajar terbaru (completion, skor, dan tren sederhana) secara konsisten.

## 3. Cakupan
In scope:
- Menampilkan metrik progress utama
- Sinkronisasi data hasil practice terbaru
- Konsistensi data setelah relogin

Out of scope:
- Analytics advanced lintas bulan
- Prediksi score future berbasis ML kompleks
- Perbandingan antar user

## 4. Preconditions
1. User sudah menyelesaikan minimal 1 task writing dan 1 task speaking.
2. User memiliki riwayat progress harian.
3. User berada dalam kondisi login aktif.

## 5. Data Uji
| Field | Nilai |
|---|---|
| Completion hari ini | >= 1 task |
| Skor writing terakhir | Tersedia |
| Skor speaking terakhir | Tersedia |

## 6. Langkah Pengujian
| No | Langkah | Expected Result |
|---|---|---|
| 1 | Buka menu `Progress` / `Dashboard` | Halaman progress tampil |
| 2 | Cek metrik completion harian | Nilai completion sesuai task yang selesai |
| 3 | Cek ringkasan skor terbaru | Skor writing/speaking terbaru tampil |
| 4 | Cek indikator tren sederhana (naik/turun/stabil) | Indikator tampil konsisten dengan histori |
| 5 | Logout lalu login ulang | Data progress tetap konsisten |
| 6 | Buka kembali dashboard progress | Tidak ada data yang hilang atau reset |

## 7. Acceptance Criteria
1. Semua metrik utama dashboard dapat dimuat tanpa error.
2. Nilai metrik selaras dengan data task yang sudah diselesaikan user.
3. Data tetap konsisten setelah relogin.
4. Tidak ada discrepancy signifikan antara halaman task dan dashboard.

## 8. Post-condition
- User memiliki visibilitas progres belajar terkini.
- Dashboard siap digunakan sebagai dasar next recommendation.

## 9. Catatan
- Definisi final metrik/rumus tren perlu diikat ke requirement numerik dari PRD final.
