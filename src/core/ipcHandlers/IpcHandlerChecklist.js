const { ipcMain } = require('electron')
const localStorage = require("../../storage/storageUtils");
const FileHelper = require("../FileHelper");

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

ipcMain.handle('deleteChecklistById', (event, id) => {
    FileHelper.deleteImages(id)
    localStorage.deleteChecklistById(id)
})