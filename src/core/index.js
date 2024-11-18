const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron')
const path = require('path')
const menuBuilder = require('./menu')
const windowStateKeeper = require('electron-window-state')
const { generateID } = require('id-generator.js');
const updater = require('./updater')
const localStorage = require('../storage/storageUtils')

let file_paths = {
    home : '../views/home.html',
    index : '../views/index.html',
    settings: '../views/settings.html',
    config: '../views/config.html',
    category: '../views/categories.html',
    practicalTest: '../views/practicalTest.html',
    practicalResults: '../views/practicalResults.html',
}

const customMeunItems  = [
    {
        label : 'Pratical Simulation',
        submenu : [
            {
                label: 'Take Practical Test',
                click(){ createPracticalTestWindow() }
            },
            {
                label: 'View Past Results',
                click(){ createPracticalResultsWindow() }
            },
        ]
    },
    {
        label : 'Configuration',
        submenu : [
            {
                label: 'Config Tag Categories',
                click(){ createCategoryWindow() }
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




   // nativeTheme.themeSource = (useDarkMode) ? 'dark' : 'light'

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

    configWindow.loadFile(path.join(__dirname, file_paths.config))

    configWindow.on('closed', () => {
        configWindow = null
    })

    
    Menu.setApplicationMenu(menu)
    configWindow.once('ready-to-show', () => {
        configWindow.show()
    })

}


let categoryWindow

const createCategoryWindow = () => {
    let windState = windowStateKeeper({
        defaultHeight: 800,
        defaultWidth: 1200
    })

    categoryWindow = new BrowserWindow({
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

    categoryWindow.loadFile(path.join(__dirname, file_paths.category))

    categoryWindow.on('closed', () => {
        categoryWindow = null
    })

    
    Menu.setApplicationMenu(menu)
    categoryWindow.once('ready-to-show', () => {
        categoryWindow.show()
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
        parent: win,
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

let practicalTestWindow

const createPracticalTestWindow = () => {
    let windState = windowStateKeeper({
        defaultHeight: 800,
        defaultWidth: 1200
    })

    practicalTestWindow = new BrowserWindow({
        width: windState.width,
        height: windState.height,
        show: false,
        minHeight: 600,
        minWidth: 800,
        parent: win,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })

    practicalTestWindow.loadFile(path.join(__dirname, file_paths.practicalTest))

    practicalTestWindow.on('closed', () => {
        practicalTestWindow = null
    })

    
    Menu.setApplicationMenu(menu)
    practicalTestWindow.once('ready-to-show', () => {
        practicalTestWindow.show()
    })

}
let practicalResultsWindow

const createPracticalResultsWindow = () => {
    let windState = windowStateKeeper({
        defaultHeight: 800,
        defaultWidth: 1200
    })

    practicalResultsWindow = new BrowserWindow({
        width: windState.width,
        height: windState.height,
        show: false,
        minHeight: 600,
        minWidth: 800,
        parent: win,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })

    practicalResultsWindow.loadFile(path.join(__dirname, file_paths.practicalResults))

    practicalResultsWindow.on('closed', () => {
        practicalResultsWindow = null
    })

    
    Menu.setApplicationMenu(menu)
    practicalResultsWindow.once('ready-to-show', () => {
        practicalResultsWindow.show()
    })

}




ipcMain.handle('popup', (event, message) => {
    return dialog.showMessageBox(win, {
        title: 'Study Helper',
        message: message,
    })
})

ipcMain.handle('dialogQuestion', async (event, message) => {
    return dialog.showMessageBox({
        type: 'info',
        title: 'Update',
        message: message,
        buttons: ['Yes', 'No']
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

ipcMain.handle('loadConfigBodyPart', (event) => {
    createConfigWindow()
})

ipcMain.handle('closeConfig', (event) => {
    if(configWindow){
        configWindow.close()
    }
})

ipcMain.handle('generateId', (event) => {
    return generateID('XXXX-XXXX-XXXX-XXXX', { letters: true, numbers: true })
})

ipcMain.handle('setChecklists', (event, checklists) => {
    localStorage.setChecklists(checklists)
})
ipcMain.handle('addOrEditChecklistById', (event, id, checklist) => {
    localStorage.addOrEditChecklistById(id, checklist)
})
ipcMain.handle('getChecklists', (event) => {
    return localStorage.getChecklists()
})
ipcMain.handle('getChecklistById', (event, id) => {
    return localStorage.getChecklistById(id)
})
ipcMain.handle('getBodyPartById', (event, bodyPartId, checklistId) => {
    return localStorage.getBodyPartById(bodyPartId, checklistId)
})
ipcMain.handle('addOrEditBodyPartById', (event, bodyPartId, checklistId, bodyPart) => {
    localStorage.addOrEditBodyPartById(bodyPartId, checklistId, bodyPart)
})
ipcMain.handle('removeBodyPart', (event, bodyPartId, checklistId) => {
    localStorage.removeBodyPart(bodyPartId, checklistId)
})
ipcMain.handle('setCategories', (event, categories) => {
    return localStorage.setCategories(categories)
})
ipcMain.handle('getCategories', (event) => {
    return localStorage.getCategories()
})
ipcMain.handle('getCategoryById', (event, categoryId) => {
    return localStorage.getCategoryById(categoryId)
})
ipcMain.handle('addOrEditCategoryById', (event, categoryId, category) => {
    localStorage.addOrEditCategoryById(categoryId, category)
})
ipcMain.handle('removeCategory', (event, categoryId) => {
    localStorage.removeCategory(categoryId)
})

ipcMain.handle('addPractical', (event, practicalId, practical) => {
    localStorage.addPractical(practicalId, practical)
})
ipcMain.handle('getPracticals', (event) => {
    return localStorage.getPracticals()
})
ipcMain.handle('getPracticalById', (event, practicalId) => {
    return localStorage.getPracticalById(practicalId)
})


ipcMain.handle('closePracticalTest', (event) => {
    if(practicalTestWindow){
        practicalTestWindow.close()
    }
})

ipcMain.handle('search', (event, isChecklistFilterChecked, isBodyPartFilterChecked, isBodyTagFilterChecked, searchQuery) => {
   return localStorage.search(isChecklistFilterChecked, isBodyPartFilterChecked, isBodyTagFilterChecked, searchQuery)
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

