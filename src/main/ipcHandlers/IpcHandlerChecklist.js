const { ipcMain } = require('electron')
const checklistStorage = require('../storage/checklistStorage')

ipcMain.handle('getChecklists', () => {
    return checklistStorage.getChecklists()
})

ipcMain.handle('getChecklistById', (event, checklistId) => {
    return checklistStorage.getChecklistById(checklistId)
})

ipcMain.handle('addOrEditChecklistById', (event, checklistId, checklist) => {
    return checklistStorage.addOrEditChecklistById(checklistId, checklist)
})

ipcMain.handle('deleteChecklistById', (event, checklistId) => {
    return checklistStorage.deleteChecklistById(checklistId)
})
