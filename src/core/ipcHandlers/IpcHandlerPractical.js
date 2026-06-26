const { ipcMain } = require('electron')

const localStorage = require("../../storage/storageUtils");

ipcMain.handle('addPractical', (event, practical) => {
    return localStorage.addPractical(practical)
})

ipcMain.handle('getPracticals', (event) => {
    return localStorage.getPracticals()
})

ipcMain.handle('getPracticalById', (event, practicalId) => {
    return localStorage.getPracticalById(practicalId)
})

ipcMain.handle('deletePracticalById', (event, practicalId) => {
    localStorage.deletePracticalById(practicalId)
})