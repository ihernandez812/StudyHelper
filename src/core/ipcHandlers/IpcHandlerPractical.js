const { ipcMain } = require('electron')

const localStorage = require("../../storage/storageUtils");

ipcMain.handle('addPractical', (event, practicalId, practical) => {
    localStorage.addPractical(practicalId, practical)
})
ipcMain.handle('getPracticals', (event) => {
    return localStorage.getPracticals()
})
ipcMain.handle('getPracticalById', (event, practicalId) => {
    return localStorage.getPracticalById(practicalId)
})
