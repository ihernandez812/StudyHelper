const { BrowserWindow, Menu, nativeTheme} = require("electron");
const windowStateKeeper = require("electron-window-state");
const path = require("path");
const lightStorage = require("../storage/storageUtils");
const windows = {};

const createWindow = (guiFilePath, options) => {
    //setTimeout(updater, 3000)
    let win = windows[guiFilePath];

    if (win != null) {
        console.log(`${guiFilePath} already exists. Reloading page`);
        win.reload();
        return;
    }

    const windState = windowStateKeeper({
        defaultHeight: 800,
        defaultWidth: 1200,
        file: `window-state-${path.basename(guiFilePath)}.json`
    })

    win = new BrowserWindow({
        width: windState.width,
        height: windState.height,
        show: false,
        x: windState.x,
        y: windState.y,
        minHeight: 800,
        minWidth: 1200,
        parent: options.parent,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            sandbox: true,
            contextIsolation: true,
            nodeIntegration: false,
        },
        icon: path.join(__dirname, '../images/AnatoMeIcon.png'),
    })

    windState.manage(win)
    const isDarkMode = lightStorage.getIsDarkMode()
    nativeTheme.themeSource = (isDarkMode) ? 'dark' : 'light'

    win.loadFile(path.join(__dirname, guiFilePath))
        .catch(err => {
            console.log(err)
        })

    win.on('closed', () => {
        delete windows[guiFilePath]
    })

    Menu.setApplicationMenu(options.menu)

    win.once('ready-to-show', () => {
        win.show()
    })

    windows[guiFilePath] = win;
}

const reloadWindow = (guiFilePath) => {
    const win = windows[guiFilePath]

    if (win) {
        win.reload()
    }
}

const getWindow = (guiFilePath) => {
    return windows[guiFilePath]
}

const closeWindow = (guiFilePath) => {
    const win = windows[guiFilePath];

    if (win) {
        win.close()
    }
}


module.exports = {
    createWindow,
    reloadWindow,
    getWindow,
    closeWindow,
}