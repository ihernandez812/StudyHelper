const { ipcMain } = require('electron')
const lightStorage = require("../storage/storageUtils");
const FileHelper = require("../FileHelper");

ipcMain.handle('setChecklists', (event, checklists) => {
    lightStorage.setChecklists(checklists)
})
ipcMain.handle('addOrEditChecklistById', (event, id, checklist) => {
    lightStorage.addOrEditChecklistById(id, checklist)
})
ipcMain.handle('getChecklists', () => {
    return lightStorage.getChecklists()
})
ipcMain.handle('getChecklistById', (event, id) => {
    return lightStorage.getChecklistById(id)
})

ipcMain.handle('deleteChecklistById', (event, id) => {
    FileHelper.deleteImages(id)
    lightStorage.deleteChecklistById(id)
})