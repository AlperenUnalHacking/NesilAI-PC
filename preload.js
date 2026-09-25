// NesilAI Masaüstü — OpenView + NesilCode köprüsü (sandbox uyumlu, yalnızca güvenli IPC)
// Renderer'a window.nesilaiDesktop ve window.nesilaiCode API'lerini açar;
// başka hiçbir Node yeteneği verilmez.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nesilaiDesktop', {
    isDesktop: true,
    platform: process.platform,
    electronVersion: process.versions.electron,

    // OpenView: bağımsız daima-üstte pencere (overlay=true → şeffaf tık geçiren mod)
    openViewWindow: (overlay) => ipcRenderer.send('openview:open-window', !!overlay),
    closeOpenViewWindow: () => ipcRenderer.send('openview:close-window'),
    isOpenViewWindowOpen: () => ipcRenderer.invoke('openview:is-window-open'),

    // Şeffaf overlay modu: pencere şeffaf + çerçevesiz + tam ekran yayar
    setOverlayMode: (enabled) => ipcRenderer.send('openview:set-overlay', !!enabled),
    isOverlayMode: () => ipcRenderer.invoke('openview:is-overlay'),

    // Tıklamaları geçir: boş alanlardan masaüstüne tık düşer (overlay için)
    setClickThrough: (enabled) => ipcRenderer.send('openview:set-click-through', !!enabled),

    // OpenView penceresi kapandığında ana pencereye bildirim
    onOpenViewWindowClosed: (cb) => ipcRenderer.on('openview:window-closed', () => cb()),

    // OpenView: bağlı monitörlerin listesi
    // → [{ id, label, isPrimary }]  örn. "Monitör 1 — Ana Ekran (1920×1080)"
    getDisplays: () => ipcRenderer.invoke('openview:get-displays'),

    // OpenView: getDisplayMedia isteklerinde kullanılacak monitörü seç
    setPreferredMonitor: (displayId) => ipcRenderer.invoke('openview:set-preferred-monitor', displayId)
});

// NesilCode — kodlama ajanı için dosya sistemi köprüsü.
// Erişim yalnızca kullanıcının iletişim kutusundan seçtiği proje klasörüne
// sınırlıdır (sınır ana süreçte uygulanır); burada yalnızca ince bir sarıcı var.
contextBridge.exposeInMainWorld('nesilaiCode', {
    fsAvailable: true,
    fsPickDir: () => ipcRenderer.invoke('nesilcode:pick-dir'),
    fsInit: () => ipcRenderer.invoke('nesilcode:reconnect'),
    rootInfo: () => ipcRenderer.invoke('nesilcode:root-info'),
    fsReadDir: (rel) => ipcRenderer.invoke('nesilcode:read-dir', rel),
    fsReadFile: (rel) => ipcRenderer.invoke('nesilcode:read-file', rel),
    fsWriteFile: (rel, content) => ipcRenderer.invoke('nesilcode:write-file', rel, content),
    fsMkdir: (rel) => ipcRenderer.invoke('nesilcode:mkdir', rel),
    fsRemove: (rel) => ipcRenderer.invoke('nesilcode:remove', rel)
});
