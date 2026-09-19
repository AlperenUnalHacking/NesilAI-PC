# NesilAI PC 🖥️

NesilAI'nin Windows masaüstü sürümü — sohbet, görsel oluşturma, sesle yazma (STT),
sesli okuma (TTS) ve görsel okuma (OCR + vision) özelliklerini tek pencerede sunan
Electron uygulaması.

> Web sürümü: [nesilai](https://github.com/AlperenUnalHacking/nesilai) ·
> Android APK: web sürümü kenar çubuğundaki **Uygulamayı indir** bağlantısından

## İndir

| Dosya | Ne için |
|---|---|
| `NesilAI-Setup-1.0.0.exe` | Kurulum sihirbazı — masaüstü + Başlat menüsü kısayolu kurar |
| `NesilAI-Portable.exe` | Kurulum gerektirmez — çift tıkla çalışır, USB'den bile açılır |

> **Not:** Uygulama imzasızdır; ilk açılışta Windows SmartScreen uyarı verebilir.
> "Daha fazla bilgi → Yine de çalıştır" demeniz yeterlidir.

## Özellikler

- 💬 Çok turlu sohbet (LLM7, Gemini, Groq, OpenRouter, OpenAI ve özel uç noktalar)
- 🎨 Görsel oluşturma (Pollinations + Flux + Turbo zinciri)
- 🎤 Sesle yazma ve 🔊 sesli okuma (Türkçe seslendirme destekli)
- 📎 Görsel okuma (OCR + vision)
- ⏹️ Yanıt durdurma butonu — akışı anında keser, kısmi yanıt korunur
- 🌗 Koyu / açık tema
- 🔗 Dış bağlantılar varsayılan tarayıcıda açılır
- 🔒 API anahtarları yalnızca yerel olarak saklanır, hiçbir sunucuya gönderilmez

## Geliştirme

```bash
npm install     # Electron + electron-builder (ilk sefer ~200 MB indirir)
npm start       # geliştirme modunda çalıştırır
npm run dist    # hem installer hem portable exe üretir
```

Çıktılar `dist/` klasörüne düşer:

- `dist/NesilAI-Setup-<sürüm>.exe` — NSIS kurulum sihirbazı
- `dist/NesilAI-Portable.exe` — taşınabilir tek dosya

Site dosyaları `website/` kaynağından `app/` içine kopyalanır
(`npm run build-www`); uygulama penceresi `app/index.html`'i yükler.

## Yapı

```
main.js             Electron ana süreç (pencere, dış linkler, güvenlik)
scripts/build-www.js  website/ → app/ kopyalama betiği
icon.ico / icon.png Uygulama simgesi (mobil/logo.png'den üretilir)
app/                Derlenen site dosyaları (index.html, js/, css/, assets/)
```

## Katkıda Bulunanlar

| | Kişi | Rol |
|---|---|---|
| <img src="https://avatars.githubusercontent.com/Acsida" width="48" alt="Acsida" /> | **[Acsida](https://github.com/Acsida)** | Baş geliştirici |
| <img src="https://hizliresim.com/svg3anb1" width="48" alt="Bloodline INC logosu" /> | **Bloodline INC** | Kurucu ortak · Ürün ve tasarım |

---

© 2026 NesilAI · Bloodline INC
