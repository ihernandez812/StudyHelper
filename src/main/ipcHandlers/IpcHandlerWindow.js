const { ipcMain } = require('electron');
const { createWindow, reloadWindow, closeWindow, getWindow} = require('../WindowFactory');
const { filePaths } = require('../WindowConstants');


ipcMain.handle('loadChecklistTester', () => {
    const win = getWindow(filePaths.home);
    const options = {
        parent: win
    }

    createWindow(filePaths.index, options)
})

ipcMain.handle('reloadHome', () => {
    reloadWindow(filePaths.home)
})

ipcMain.handle('loadConfigBodyPart', () => {
    const win = getWindow(filePaths.home);
    const options = {
        parent: win
    }

    createWindow(filePaths.config, options)
})

ipcMain.handle('closeConfig', () => {
    closeWindow(filePaths.config)
})

ipcMain.handle('closePracticalTest', () => {
   closeWindow(filePaths.practicalTest)
})