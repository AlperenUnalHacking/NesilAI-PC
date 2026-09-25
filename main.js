// NesilAI Masaüstü — Electron ana süreç
// website/ klasöründen derlenen app/ içeriğini uygulama penceresinde gösterir.
const { app, BrowserWindow, shell, Menu, Tray, nativeImage, ipcMain, desktopCapturer, screen, session, dialog } = require('electron');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

let mainWindow = null;
let tray = null;
let quitting = false;

function createWindow() {
    const iconPath = path.join(__dirname, 'icon.png');
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 480,
        minHeight: 400,
        title: 'NesilAI',
        // Logo hem görev çubuğunda hem pencere ikonu olarak görünür
        icon: require('fs').existsSync(iconPath) ? iconPath : undefined,
        autoHideMenuBar: true,
        backgroundColor: '#0a0a0d',
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    // Başlık değişimini sabitle (sayfa kendi başlığını yazıyor, sorun değil ama tutarlı olsun)
    win.on('page-title-updated', (e) => e.preventDefault());

    // Dış bağlantılar (Bloodline linki vb.) varsayılan tarayıcıda açılır
    win.webContents.setWindowOpenHandler(({ url }) => {
        if (/^https?:\/\//i.test(url)) {
            shell.openExternal(url);
        }
        return { action: 'deny' };
    });

    // Pencere "kapatılınca" uygulamadan çıkma — tepsiye küçül (arka planda çalışmaya devam)
    win.on('close', (e) => {
        if (!quitting && tray) {
            e.preventDefault();
            win.hide();
        }
    });

    win.loadFile(path.join(__dirname, 'app', 'index.html'));
}

// ========================================================
// Sistem tepsisi — NesilAI arka planda çalışır
// ========================================================
function createTray() {
    const iconPath = path.join(__dirname, 'icon.png');
    if (!require('fs').existsSync(iconPath)) return;
    try {
        tray = new Tray(iconPath);
        tray.setToolTip('NesilAI');
        tray.on('click', () => {
            // Tek tık: göster/odakla (zaten görünürse küçültme — basit tutuldu)
            if (mainWindow && !mainWindow.isDestroyed()) {
                if (mainWindow.isVisible()) mainWindow.focus();
                else mainWindow.show();
            }
        });
        rebuildTrayMenu();
    } catch (e) {
        console.warn('Tepsi oluşturulamadı:', e);
    }
}

function rebuildTrayMenu() {
    if (!tray) return;
    const ovOpen = !!(openviewWindow && !openviewWindow.isDestroyed());
    const ovOverlay = ovOpen && !!(openviewWindow && !openviewWindow.isDestroyed() && openviewWindow.__ovOverlay);
    const items = [
        { label: 'NesilAI\u2019yı Göster', click: () => { if (mainWindow && !mainWindow.isDestroyed()) { mainWindow.show(); mainWindow.focus(); } } },
        { type: 'separator' },
        {
            label: 'OpenView\u2019ı Aç',
            type: 'checkbox',
            checked: ovOpen,
            click: (item) => { item.checked ? openOrFocusOpenViewWindow() : closeOpenViewWindow(); }
        },
        {
            label: 'Şeffaf Overlay Modu',
            type: 'checkbox',
            enabled: ovOpen,
            checked: ovOverlay,
            click: (item) => { setOpenViewOverlay(ovOpen, item.checked); }
        },
        { type: 'separator' },
        { label: 'Çıkış', click: () => { quitting = true; app.quit(); } }
    ];
    tray.setContextMenu(Menu.buildFromTemplate(items));
}

app.whenReady().then(() => {
    // Uygulama menüsünü kaldır — temiz arayüz
    Menu.setApplicationMenu(null);
    setupOpenViewDisplayHandler(); // OpenView ekran yakalama köprüsü
    createWindow();
    createTray();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

// Pencere kapatınca tepsiye küçülüyorsak uygulamadan çıkma; Çıkış menüsünden çıkılır
app.on('before-quit', () => { quitting = true; });

app.on('window-all-closed', () => {
    // Tepsi varken arka planda yaşamaya devam et; tepsi yoksa eski davranış
    if (!tray || quitting) {
        if (process.platform !== 'darwin') app.quit();
    }
});

// ========================================================
// OpenView — bağımsız ekran asistanı penceresi
// --------------------------------------------------------
// Kullanıcı /openview dediğinde OpenView AYRI BİR UYGULAMA
// penceresi olarak açılır: daima üstte, kendi başlığıyla
// ("OpenView"), gerçek app/index.html'i yükler — file://
// CSS hilesi yok, sayfa ana pencereyle aynı şekilde yüklenir.
// ========================================================
let openviewWindow = null;
let preferredDisplayId = null;

function createOpenViewWindow(overlay) {
    const useOverlay = !!overlay;

    if (openviewWindow && !openviewWindow.isDestroyed()) {
        // Pencere açık; yalnızca mod değişimi istendiyse yeniden yarat
        if (!!openviewWindow.__ovOverlay === useOverlay) {
            openviewWindow.show();
            openviewWindow.focus();
            return;
        }
        try { openviewWindow.destroy(); } catch (e) { /* yoksay */ }
        openviewWindow = null;
    }

    const iconPath = path.join(__dirname, 'icon.png');
    openviewWindow = new BrowserWindow({
        width: 420,
        height: 600,
        minWidth: 320,
        minHeight: 400,
        title: 'OpenView',
        icon: require('fs').existsSync(iconPath) ? iconPath : undefined,
        autoHideMenuBar: true,
        // Overlay modu: şeffaf zemin, çerçevesiz, tam ekranda yüzen panel
        transparent: useOverlay,
        frame: !useOverlay,
        backgroundColor: useOverlay ? '#00000000' : '#10121e',
        alwaysOnTop: true, // ekran asistanı — her zaman üstte yüzer
        skipTaskbar: useOverlay, // overlay modunda görev çubuğunu kirletmesin
        resizable: !useOverlay,
        fullscreenable: false,
        hasShadow: !useOverlay,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });
    openviewWindow.setAlwaysOnTop(true, 'screen-saver');
    openviewWindow.__ovOverlay = useOverlay;

    // Overlay modu: tüm monitörlerin birleşik sınırlarına yay (tık geçiren overlay)
    if (useOverlay) {
        try {
            const area = getWorkAreaUnion();
            openviewWindow.setPosition(area.x, area.y);
            openviewWindow.setSize(area.width, area.height);
        } catch (e) { /* tek ekran varsayımıyla devam */ }
    }

    // Pencere başlığı sabit "OpenView" kalsın
    openviewWindow.on('page-title-updated', (e) => e.preventDefault());

    openviewWindow.on('closed', () => {
        openviewWindow = null;
        rebuildTrayMenu();
        // Ana pencereye haber ver: panel durumu sıfırlanabilir
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('openview:window-closed');
        }
    });

    // Aynı uygulama sayfası — ?ovwindow=1 ile OpenView pencere modunda açılır
    openviewWindow.loadFile(path.join(__dirname, 'app', 'index.html'), {
        query: Object.assign({ ovwindow: '1' }, useOverlay ? { overlay: '1' } : {})
    });
}

function openOrFocusOpenViewWindow(overlay) {
    createOpenViewWindow(overlay);
    rebuildTrayMenu();
}

function closeOpenViewWindow() {
    if (openviewWindow && !openviewWindow.isDestroyed()) openviewWindow.close();
}

function setOpenViewOverlay(show, overlay) {
    if (show) {
        createOpenViewWindow(overlay);
    } else if (openviewWindow && !openviewWindow.isDestroyed() && !!openviewWindow.__ovOverlay !== !!overlay) {
        // Pencere açık ama mod farklıysa yeniden yarat
        createOpenViewWindow(overlay);
    }
    rebuildTrayMenu();
}

// Tüm monitörlerin çalışma alanlarının birleşimi — overlay bu dikdörtgene yayılır
function getWorkAreaUnion() {
    try {
        const displays = screen.getAllDisplays();
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        displays.forEach((d) => {
            const a = d.workArea;
            minX = Math.min(minX, a.x); minY = Math.min(minY, a.y);
            maxX = Math.max(maxX, a.x + a.width); maxY = Math.max(maxY, a.y + a.height);
        });
        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    } catch (e) {
        const a = screen.getPrimaryDisplay().workArea;
        return { x: a.x, y: a.y, width: a.width, height: a.height };
    }
}

// --- OpenView IPC ---
ipcMain.on('openview:open-window', (_event, overlay) => openOrFocusOpenViewWindow(!!overlay));

ipcMain.on('openview:close-window', () => closeOpenViewWindow());

// Overlay modunu çalışırken aç/kapat (pencere yeniden yaratılır)
ipcMain.on('openview:set-overlay', (_event, enabled) => setOpenViewOverlay(true, !!enabled));

ipcMain.handle('openview:is-window-open', () => !!(openviewWindow && !openviewWindow.isDestroyed()));
ipcMain.handle('openview:is-overlay', () => !!(openviewWindow && !openviewWindow.isDestroyed() && openviewWindow.__ovOverlay));

// Tıklamaları geçir (click-through): overlay panelin boş alanlarından masaüstüne tık düşer
ipcMain.on('openview:set-click-through', (_event, enabled) => {
    if (!openviewWindow || openviewWindow.isDestroyed()) return;
    try { openviewWindow.setIgnoreMouseEvents(!!enabled, { forward: true }); } catch (e) { /* yoksay */ }
});

// Monitör listesi: "Monitör 1 — Ana Ekran (1920×1080)" biçiminde
ipcMain.handle('openview:get-displays', () => {
    try {
        const primary = screen.getPrimaryDisplay();
        return screen.getAllDisplays().map((d, i) => ({
            id: d.id,
            label: `Monitör ${i + 1}${d.id === primary.id ? ' — Ana Ekran' : ' — İkincil Ekran'} (${d.size.width}×${d.size.height})`,
            isPrimary: d.id === primary.id
        }));
    } catch (e) {
        return [];
    }
});

// OpenView'ın kendi arayüzünden seçilen monitör kaydedilir
ipcMain.handle('openview:set-preferred-monitor', (_event, displayId) => {
    preferredDisplayId = displayId == null ? null : String(displayId);
    return true;
});

// getDisplayMedia istekleri: sistem seçici yerine tercih edilen monitör
// otomatik seçilir — OpenView kendi monitör seçim arayüzünü kullanır.
function setupOpenViewDisplayHandler() {
    try {
        session.defaultSession.setDisplayMediaRequestHandler((_request, callback) => {
            desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
                if (!sources || sources.length === 0) {
                    callback({ video: null });
                    return;
                }
                let pick = sources[0];
                if (preferredDisplayId) {
                    const matched = sources.find(s => s.display_id === preferredDisplayId);
                    if (matched) pick = matched;
                } else {
                    try {
                        const primary = screen.getPrimaryDisplay();
                        const matched = sources.find(s => s.display_id === String(primary.id));
                        if (matched) pick = matched;
                    } catch (e) { /* varsayılan kaynak kullanılır */ }
                }
                callback({ video: pick });
            }).catch(() => callback({ video: null }));
        });
    } catch (e) {
        // Eski Electron sürümü: sistem seçiciye düşer
        console.warn('OpenView display handler kurulamadı:', e);
    }
}
// ========================================================
// NesilCode — kodlama ajanı için güvenli dosya sistemi köprüsü
// Renderer sandbox'ta çalışır; disk erişimi yalnızca bu IPC
// işleyicileri üzerinden, kullanıcı tarafından seçilen proje
// klasörüne sınırlıdır.
// ========================================================
let ncRoot = null;          // yetkili proje kökü (mutlak yol)
let ncRootLabel = 'Proje klasörü (disk)';

function ncResolve(rel) {
    // Kök dışına çıkışı engelle; mutlak/garip yollar köke bağlanır. Boş = kök.
    const clean = String(rel == null ? '' : rel).replace(/\\/g, '/');
    const resolved = path.resolve(ncRoot, clean.replace(/^\/+/, ''));
    const normRoot = path.resolve(ncRoot);
    if (resolved !== normRoot && !resolved.startsWith(normRoot + path.sep)) {
        throw new Error('Kök dışındaki yola erişim engellendi: ' + rel);
    }
    return resolved;
}

async function ncReadDir(rel) {
    if (!ncRoot) throw new Error('Önce bir proje klasörü seç.');
    const dir = ncResolve(rel);
    let entries;
    try {
        entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch (e) {
        if (e.code === 'ENOENT') throw new Error('Klasör bulunamadı: ' + (rel || '.'));
        throw e;
    }
    const out = [];
    for (const ent of entries) {
        if (ent.name.startsWith('.')) continue;    // gizli dosyaları listeleme
        if (ent.name === 'node_modules') continue; // ajanı kilitleyen dev klasör
        const abs = path.join(dir, ent.name);
        if (ent.isDirectory()) {
            out.push({ name: ent.name, type: 'dir' });
        } else if (ent.isFile()) {
            let size = 0;
            try { size = (await fsp.stat(abs)).size; } catch (e) { /* silinmiş olabilir */ }
            out.push({ name: ent.name, type: 'file', size: size });
        }
    }
    out.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : (a.type === 'dir' ? -1 : 1)));
    return out;
}

async function ncReadFile(rel) {
    if (!ncRoot) throw new Error('Önce bir proje klasörü seç.');
    const file = ncResolve(rel);
    const stat = await fsp.stat(file);
    if (stat.size > 2 * 1024 * 1024) throw new Error('Dosya çok büyük (>2 MB): ' + rel);
    const buf = await fsp.readFile(file);
    if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) return buf.slice(3).toString('utf8');
    if (buf.includes(0)) throw new Error('İkili dosya okunamaz: ' + rel);
    return buf.toString('utf8');
}

async function ncWriteFile(rel, content) {
    if (!ncRoot) throw new Error('Önce bir proje klasörü seç.');
    const file = ncResolve(rel);
    await fsp.mkdir(path.dirname(file), { recursive: true });   // ara klasörleri de oluştur
    await fsp.writeFile(file, String(content), 'utf8');
    return true;
}

async function ncMkdir(rel) {
    if (!ncRoot) throw new Error('Önce bir proje klasörü seç.');
    await fsp.mkdir(ncResolve(rel), { recursive: true });
    return true;
}

async function ncRemove(rel) {
    if (!ncRoot) throw new Error('Önce bir proje klasörü seç.');
    const target = ncResolve(rel);
    if (target === path.resolve(ncRoot)) throw new Error('Proje kökü silinemez.');
    await fsp.rm(target, { recursive: true, force: true });
    return true;
}

ipcMain.handle('nesilcode:pick-dir', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(win, {
        title: 'NesilCode — proje klasörü seç',
        properties: ['openDirectory', 'createDirectory']
    });
    if (result.canceled || !result.filePaths.length) return false;
    ncRoot = result.filePaths[0];
    ncRootLabel = ncRoot;
    return true;
});

ipcMain.handle('nesilcode:reconnect', () => !!ncRoot);
ipcMain.handle('nesilcode:root-info', () => ({ label: ncRootLabel, connected: !!ncRoot }));
ipcMain.handle('nesilcode:read-dir', (_e, rel) => ncReadDir(rel));
ipcMain.handle('nesilcode:read-file', (_e, rel) => ncReadFile(rel));
ipcMain.handle('nesilcode:write-file', (_e, rel, content) => ncWriteFile(rel, content));
ipcMain.handle('nesilcode:mkdir', (_e, rel) => ncMkdir(rel));
ipcMain.handle('nesilcode:remove', (_e, rel) => ncRemove(rel));
