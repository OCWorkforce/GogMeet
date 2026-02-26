"use strict";
const __rslib_import_meta_url__ = /*#__PURE__*/ function() {
    return "u" < typeof document ? new (require('url'.replace('', ''))).URL('file:' + __filename).href : document.currentScript && document.currentScript.src || new URL('main.js', document.baseURI).href;
}();
var __webpack_require__ = {};
(()=>{
    __webpack_require__.n = (module)=>{
        var getter = module && module.__esModule ? ()=>module['default'] : ()=>module;
        __webpack_require__.d(getter, {
            a: getter
        });
        return getter;
    };
})();
(()=>{
    __webpack_require__.d = (exports1, definition)=>{
        for(var key in definition)if (__webpack_require__.o(definition, key) && !__webpack_require__.o(exports1, key)) Object.defineProperty(exports1, key, {
            enumerable: true,
            get: definition[key]
        });
    };
})();
(()=>{
    __webpack_require__.o = (obj, prop)=>Object.prototype.hasOwnProperty.call(obj, prop);
})();
(()=>{
    __webpack_require__.r = (exports1)=>{
        if ("u" > typeof Symbol && Symbol.toStringTag) Object.defineProperty(exports1, Symbol.toStringTag, {
            value: 'Module'
        });
        Object.defineProperty(exports1, '__esModule', {
            value: true
        });
    };
})();
var __webpack_exports__ = {};
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
    mainWindow: ()=>mainWindow,
    nativeImage: ()=>external_electron_namespaceObject.nativeImage,
    screen: ()=>external_electron_namespaceObject.screen,
    __dirname: ()=>main_dirname,
    shell: ()=>external_electron_namespaceObject.shell
});
const external_electron_namespaceObject = require("electron");
const external_node_path_namespaceObject = require("node:path");
var external_node_path_default = /*#__PURE__*/ __webpack_require__.n(external_node_path_namespaceObject);
const external_node_url_namespaceObject = require("node:url");
const tray_dirname = external_node_path_default().dirname((0, external_node_url_namespaceObject.fileURLToPath)(__rslib_import_meta_url__));
let tray = null;
function setupTray(win) {
    const iconPath = external_electron_namespaceObject.app.isPackaged ? external_node_path_default().join(process.resourcesPath, 'app', 'src', 'assets', 'tray-iconTemplate.png') : external_node_path_default().join(tray_dirname, '..', '..', 'src', 'assets', 'tray-iconTemplate.png');
    const icon = external_electron_namespaceObject.nativeImage.createFromPath(iconPath).resize({
        width: 18,
        height: 18
    });
    icon.setTemplateImage(true);
    tray = new external_electron_namespaceObject.Tray(icon);
    tray.setToolTip('Google Meet');
    external_electron_namespaceObject.app.setAboutPanelOptions({
        applicationName: 'Google Meet',
        applicationVersion: external_electron_namespaceObject.app.getVersion(),
        version: external_electron_namespaceObject.app.getVersion(),
        credits: 'Developed by CCWorkforce',
        copyright: `© ${new Date().getFullYear()} CCWorkforce`,
        iconPath
    });
    const contextMenu = external_electron_namespaceObject.Menu.buildFromTemplate([
        {
            label: 'Open Google Meet',
            click: ()=>showWindow(win)
        },
        {
            type: 'separator'
        },
        {
            label: 'About Google Meet',
            click: ()=>external_electron_namespaceObject.app.showAboutPanel()
        },
        {
            type: 'separator'
        },
        {
            label: 'Quit',
            accelerator: 'Cmd+Q',
            click: ()=>external_electron_namespaceObject.app.quit()
        }
    ]);
    tray.on('click', ()=>{
        tray.popUpContextMenu(contextMenu);
    });
    tray.on('right-click', ()=>{
        tray.popUpContextMenu(contextMenu);
    });
}
function showWindow(win) {
    const trayBounds = tray.getBounds();
    const position = getWindowPosition(win, trayBounds);
    win.setPosition(position.x, position.y, false);
    win.show();
    win.focus();
    external_electron_namespaceObject.app.dock?.hide();
}
function getWindowPosition(win, trayBounds) {
    const winBounds = win.getBounds();
    const display = external_electron_namespaceObject.screen.getDisplayNearestPoint({
        x: trayBounds.x,
        y: trayBounds.y
    });
    const workArea = display.workArea;
    let x = Math.round(trayBounds.x + trayBounds.width / 2 - winBounds.width / 2);
    let y = Math.round(trayBounds.y + trayBounds.height + 4);
    x = Math.max(workArea.x, Math.min(x, workArea.x + workArea.width - winBounds.width));
    y = Math.max(workArea.y, Math.min(y, workArea.y + workArea.height - winBounds.height));
    return {
        x,
        y
    };
}
const IPC_CHANNELS = {
    CALENDAR_GET_EVENTS: 'calendar:get-events',
    CALENDAR_REQUEST_PERMISSION: 'calendar:request-permission',
    CALENDAR_PERMISSION_STATUS: 'calendar:permission-status',
    WINDOW_MINIMIZE_TO_TRAY: 'window:minimize-to-tray',
    WINDOW_RESTORE: 'window:restore',
    APP_OPEN_EXTERNAL: 'app:open-external',
    APP_GET_VERSION: 'app:get-version'
};
const external_node_child_process_namespaceObject = require("node:child_process");
const external_node_util_namespaceObject = require("node:util");
const promises_namespaceObject = require("node:fs/promises");
const external_node_fs_namespaceObject = require("node:fs");
const external_node_os_namespaceObject = require("node:os");
const execFileAsync = (0, external_node_util_namespaceObject.promisify)(external_node_child_process_namespaceObject.execFile);
const calendar_dirname = (0, external_node_path_namespaceObject.join)((0, external_node_url_namespaceObject.fileURLToPath)(__rslib_import_meta_url__), '..');
const SWIFT_SRC_DEV = (0, external_node_path_namespaceObject.join)(calendar_dirname, '..', '..', 'src', 'main', 'gimeet-events.swift');
const BINARY_DIR = (0, external_node_path_namespaceObject.join)((0, external_node_os_namespaceObject.tmpdir)(), 'gimeet');
const BINARY_PATH = (0, external_node_path_namespaceObject.join)(BINARY_DIR, 'gimeet-events');
async function ensureBinary() {
    try {
        await (0, promises_namespaceObject.access)(BINARY_PATH, external_node_fs_namespaceObject.constants.X_OK);
        return;
    } catch  {}
    await (0, promises_namespaceObject.mkdir)(BINARY_DIR, {
        recursive: true
    });
    let swiftSrc = SWIFT_SRC_DEV;
    try {
        await (0, promises_namespaceObject.access)(swiftSrc, external_node_fs_namespaceObject.constants.R_OK);
    } catch  {
        swiftSrc = (0, external_node_path_namespaceObject.join)(process.resourcesPath, 'app', 'src', 'main', 'gimeet-events.swift');
    }
    try {
        await execFileAsync('swiftc', [
            swiftSrc,
            '-o',
            BINARY_PATH
        ], {
            timeout: 60000
        });
    } catch  {
        await execFileAsync('swiftc', [
            swiftSrc,
            '-o',
            BINARY_PATH,
            '-sdk',
            '/Applications/Xcode.app/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX.sdk'
        ], {
            timeout: 60000
        });
    }
}
async function runSwiftHelper() {
    await ensureBinary();
    const { stdout } = await execFileAsync(BINARY_PATH, [], {
        timeout: 15000
    });
    return stdout.trim();
}
function parseEvents(raw) {
    if (!raw) return [];
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    const searchEnd = new Date(todayMidnight);
    searchEnd.setDate(searchEnd.getDate() + 2);
    const seen = new Set();
    return raw.split('\n').map((line)=>line.trim()).filter(Boolean).flatMap((line)=>{
        const parts = line.split('||');
        if (parts.length < 7) return [];
        const [id, title, startStr, endStr, urlField, calendarName, allDayStr] = parts;
        const meetUrl = urlField.trim();
        if (!meetUrl || !meetUrl.startsWith('https://meet.google.com/')) return [];
        const startDate = new Date(startStr);
        const endDate = new Date(endStr);
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return [];
        if (startDate < todayMidnight || startDate >= searchEnd) return [];
        const uid = id.trim();
        if (seen.has(uid)) return [];
        seen.add(uid);
        return [
            {
                id: uid,
                title: title.trim(),
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                meetUrl,
                calendarName: calendarName.trim(),
                isAllDay: 'true' === allDayStr.trim()
            }
        ];
    }).sort((a, b)=>new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
}
async function getCalendarEvents() {
    try {
        const output = await runSwiftHelper();
        return parseEvents(output);
    } catch (err) {
        console.error('[calendar] getCalendarEvents error:', err);
        return [];
    }
}
async function runAppleScript(script) {
    const { stdout } = await execFileAsync("osascript", [
        '-e',
        script
    ], {
        timeout: 10000
    });
    return stdout.trim();
}
async function requestCalendarPermission() {
    try {
        await runAppleScript(`
      tell application "Calendar"
        get name of calendars
      end tell
    `);
        return 'granted';
    } catch  {
        return 'denied';
    }
}
async function getCalendarPermissionStatus() {
    try {
        await runAppleScript(`
      tell application "Calendar"
        get name of first calendar
      end tell
    `);
        return 'granted';
    } catch (err) {
        const msg = String(err);
        if (msg.includes('not authorized') || msg.includes('1743')) return 'denied';
        msg.includes('2700') || msg.includes('not determined');
        return 'not-determined';
    }
}
function registerIpcHandlers(win) {
    external_electron_namespaceObject.ipcMain.handle(IPC_CHANNELS.CALENDAR_GET_EVENTS, async ()=>getCalendarEvents());
    external_electron_namespaceObject.ipcMain.handle(IPC_CHANNELS.CALENDAR_REQUEST_PERMISSION, async ()=>requestCalendarPermission());
    external_electron_namespaceObject.ipcMain.handle(IPC_CHANNELS.CALENDAR_PERMISSION_STATUS, async ()=>getCalendarPermissionStatus());
    external_electron_namespaceObject.ipcMain.on(IPC_CHANNELS.WINDOW_MINIMIZE_TO_TRAY, ()=>{
        win.hide();
        external_electron_namespaceObject.app.dock?.hide();
    });
    external_electron_namespaceObject.ipcMain.on(IPC_CHANNELS.WINDOW_RESTORE, ()=>{
        win.show();
        win.focus();
    });
    external_electron_namespaceObject.ipcMain.handle(IPC_CHANNELS.APP_OPEN_EXTERNAL, async (_event, url)=>{
        if ('string' == typeof url && url.startsWith('https://')) await external_electron_namespaceObject.shell.openExternal(url);
    });
    external_electron_namespaceObject.ipcMain.handle(IPC_CHANNELS.APP_GET_VERSION, ()=>external_electron_namespaceObject.app.getVersion());
}
const main_dirname = external_node_path_default().dirname((0, external_node_url_namespaceObject.fileURLToPath)(__rslib_import_meta_url__));
const isDev = !external_electron_namespaceObject.app.isPackaged;
let mainWindow = null;
function createWindow() {
    const win = new external_electron_namespaceObject.BrowserWindow({
        width: 360,
        height: 480,
        show: false,
        frame: false,
        resizable: false,
        movable: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        vibrancy: 'popover',
        visualEffectState: 'active',
        titleBarStyle: 'hidden',
        transparent: true,
        hasShadow: true,
        webPreferences: {
            preload: external_node_path_default().join(main_dirname, '..', 'preload', 'index.cjs'),
            sandbox: true,
            contextIsolation: true,
            nodeIntegration: false
        }
    });
    if (isDev) {
        const devUrl = process.env['VITE_DEV_SERVER_URL'] ?? 'http://localhost:5173';
        win.loadURL(devUrl);
    } else win.loadFile(external_node_path_default().join(main_dirname, '..', 'renderer', 'index.html'));
    win.on('close', (event)=>{
        event.preventDefault();
        win.hide();
        external_electron_namespaceObject.app.dock?.hide();
    });
    win.on('minimize', ()=>{
        win.hide();
        external_electron_namespaceObject.app.dock?.hide();
    });
    win.on('blur', ()=>{
        if (!isDev) {
            win.hide();
            external_electron_namespaceObject.app.dock?.hide();
        }
    });
    return win;
}
external_electron_namespaceObject.app.whenReady().then(()=>{
    external_electron_namespaceObject.app.dock?.hide();
    mainWindow = createWindow();
    registerIpcHandlers(mainWindow);
    setupTray(mainWindow);
});
external_electron_namespaceObject.app.on('window-all-closed', ()=>{});
external_electron_namespaceObject.app.on('before-quit', ()=>{
    if (mainWindow) {
        mainWindow.removeListener('close', ()=>{});
        mainWindow.destroy();
    }
});
exports.__dirname = __webpack_exports__.__dirname;
exports.mainWindow = __webpack_exports__.mainWindow;
exports.nativeImage = __webpack_exports__.nativeImage;
exports.screen = __webpack_exports__.screen;
exports.shell = __webpack_exports__.shell;
for(var __rspack_i in __webpack_exports__)if (-1 === [
    "__dirname",
    "mainWindow",
    "nativeImage",
    "screen",
    "shell"
].indexOf(__rspack_i)) exports[__rspack_i] = __webpack_exports__[__rspack_i];
Object.defineProperty(exports, '__esModule', {
    value: true
});
