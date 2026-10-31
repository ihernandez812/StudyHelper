const { ipcMain } = require('electron')
const { checkForUpdates, downloadUpdate, installUpdate } = require('../updater')

ipcMain.handle('checkForUpdates', () => {
    return checkForUpdates()
})

ipcMain.handle('downloadUpdate', () => {
    return downloadUpdate()
})

ipcMain.handle('installUpdate', () => {
    installUpdate()
})
