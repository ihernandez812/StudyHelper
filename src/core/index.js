const { app, BrowserWindow, Menu, nativeTheme, ipcMain, dialog } = require('electron')
const path = require('path')
const menuBuilder = require('./menu')
const Storage = require('electron-light-storage')
const store = new Storage()
const windowStateKeeper = require('electron-window-state')
const { generateID } = require('id-generator.js');
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
        minHeight: 600,
        minWidth: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })

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

ipcMain.handle('loadEditChecklist', (event) => {
    createConfigWindow()
})

ipcMain.handle('generateId', (event) => {
    return generateID('XXXX-XXXX-XXXX-XXXX', { letters: true, numbers: true })
})

ipcMain.handle('addIdsToChecklists', (event, checklists) => {
    let sanatizedChecklists = {}
    if(Array.isArray(checklists)){
        for(let checklist of checklists){
            let checklistName = Object.keys(checklist)[0]
            let bodyParts = checklist[checklistName]
            let checklistId = generateID('XXXX-XXXX-XXXX-XXXX', { letters: true, numbers: true })
            let sanatizedBodyParts = {}
            for(let bodyPartObj of bodyParts){
                let bodyPartName = Object.keys(bodyPartObj)[0]
                let bodyPartId = generateID('XXXX-XXXX-XXXX-XXXX', { letters: true, numbers: true })
                let bodyPart = bodyPartObj[bodyPartName]
                sanatizedBodyParts[bodyPartId] = {
                    name: bodyPartName,
                    coordinates: bodyPart['coordinates'],
                    img: bodyPart['img']
                }
            }
            sanatizedChecklists[checklistId] = {
                name: checklistName,
                bodyParts : sanatizedBodyParts
            }
        }
    } else{
        sanatizedChecklists = checklists
    }
    return sanatizedChecklists
})

ipcMain.handle('addIdsToTags', (event, checklists) => {
    for(let key in checklists){
        let checklist = checklists[key]
        let bodyParts = checklist['bodyParts']
        for(let key in bodyParts){
            let bodyPart = bodyParts[key]
            let coordinates = bodyPart['coordinates']
            let sanatizedCoordinates = {}
            for(let key in coordinates){
                let coordinatesString = coordinates[key]
                if(typeof coordinatesString == 'string'){
                    let id = generateID('XXXX-XXXX-XXXX-XXXX', { letters: true, numbers: true })
                    
                    let x_coordinate = coordinatesString.split(' ')[0]
                    let y_coordinate = coordinatesString.split(' ')[1]
                    sanatizedCoordinates[id] = {
                        name: key,
                        x: x_coordinate,
                        y: y_coordinate

                    }
                } else{
                    sanatizedCoordinates[key] = coordinatesString
                }
            }
            bodyPart['coordinates'] = sanatizedCoordinates
        }
    }

    return checklists
})



app.on('ready', createWindow)

app.on('window-all-closed', () => {
    app.quit()
})

