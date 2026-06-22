const { BrowserWindow, Menu} = require("electron");
const updater = require("./updater");
const windowStateKeeper = require("electron-window-state");
const path = require("path");
const windows = {};

const createWindow = (guiFilePath, options) => {
    //setTimeout(updater, 3000)
    let win = windows[guiFilePath];

    if (win != null) {
        console.log(`${guiFilePath} already exists. Reloading page`);
        win.reload();
        return;
    }

    let windState = windowStateKeeper({
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
        sandbox: true,
        parent: options.parent,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })

    windState.manage(win)

    // nativeTheme.themeSource = (useDarkMode) ? 'dark' : 'light'

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

const reloadWindow = (guiFilePath, options) => {
    let win = windows[guiFilePath]

    if (win) {
        win.reload()
    }
}

const getWindow = (guiFilePath) => {
    return windows[guiFilePath]
}

const closeWindow = (guiFilePath) => {
    let win = windows[guiFilePath];

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