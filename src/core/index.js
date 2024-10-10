const { app, BrowserWindow, Menu, nativeTheme, ipcMain, dialog } = require('electron')
const path = require('path')
const menuBuilder = require('./menu')
const Storage = require('electron-light-storage')
const store = new Storage()
const windowStateKeeper = require('electron-window-state')
const updater = require('./updater')

let file_paths = {
    home : '../views/home.html',
    index : '../views/index.html',
    settings: '../views/settings.html',
    config: '../views/config.html'
}

const customMeunItems  = [
    {
        label : 'Configuration',
        submenu : [
            {
                label: 'Add Checklist',
                click(){ createConfigWindow() }
            }
        ]
    }
]

app.disableHardwareAcceleration()
const menu = menuBuilder(customMeunItems)
let win

const createWindow = () => {
    
    setTimeout(updater, 3000)
    let windState = windowStateKeeper({
        defaultHeight: 800,
        defaultWidth: 1200
    })

    win = new BrowserWindow({
        width: windState.width,
        height: windState.height,
        show: false,
        x: windState.x,
        y: windState.y,
        minHeight: 800,
        minWidth: 1200,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })

    windState.manage(win)

    if (!Object.keys(store.get()).includes('darkMode')) {
        store.set({ 'darkMode': false })
    }

    useDarkMode = store.get().darkMode

    nativeTheme.themeSource = (useDarkMode) ? 'dark' : 'light'

    win.loadFile(path.join(__dirname, file_paths.home))

    win.on('closed', () => {
        win = null
    })

    
    Menu.setApplicationMenu(menu)
    win.once('ready-to-show', () => {
        win.show()
    })

}

let configWindow

const createConfigWindow = () => {
    let windState = windowStateKeeper({
        defaultHeight: 800,
        defaultWidth: 1200
    })

    configWindow = new BrowserWindow({
        width: windState.width,
        height: windState.height,
        show: false,
        x: windState.x,
        y: windState.y,
        minHeight: 800,
        minWidth: 1200,
        parent: win,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })


    if (!Object.keys(store.get()).includes('darkMode')) {
        store.set({ 'darkMode': false })
    }

    useDarkMode = store.get().darkMode

    nativeTheme.themeSource = (useDarkMode) ? 'dark' : 'light'

    configWindow.loadFile(path.join(__dirname, file_paths.config))

    configWindow.on('closed', () => {
        configWindow = null
    })

    
    Menu.setApplicationMenu(menu)
    configWindow.once('ready-to-show', () => {
        configWindow.show()
    })

}


let checklistTesterWindow

const createChecklistTestWindow = () => {
    let windState = windowStateKeeper({
        defaultHeight: 800,
        defaultWidth: 1200
    })

    checklistTesterWindow = new BrowserWindow({
        width: windState.width,
        height: windState.height,
        show: false,
        x: windState.x,
        y: windState.y,
        minHeight: 600,
        minWidth: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })


    if (!Object.keys(store.get()).includes('darkMode')) {
        store.set({ 'darkMode': false })
    }

    useDarkMode = store.get().darkMode

    nativeTheme.themeSource = (useDarkMode) ? 'dark' : 'light'

    checklistTesterWindow.loadFile(path.join(__dirname, file_paths.index))

    checklistTesterWindow.on('closed', () => {
        checklistTesterWindow = null
    })

    
    Menu.setApplicationMenu(menu)
    checklistTesterWindow.once('ready-to-show', () => {
        checklistTesterWindow.show()
    })

}

ipcMain.handle('popup', (event, message) => {
    dialog.showMessageBox(win, {
        title: 'Study Helper',
        message: message,
    })
})

ipcMain.handle('loadChecklistTester', (event) => {
    createChecklistTestWindow()
})

ipcMain.handle('reloadHome', (event) => {
    if(win){
        win.reload()
    }
})

app.on('ready', createWindow)

app.on('window-all-closed', () => {
    app.quit()
})

