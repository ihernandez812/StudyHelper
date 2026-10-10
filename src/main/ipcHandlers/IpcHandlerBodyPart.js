const { ipcMain } = require('electron')
const bodyPartStorage = require('../storage/bodyPartStorage')

ipcMain.handle('getBodyPartById', (event, bodyPartId) => {
    return bodyPartStorage.getBodyPartById(bodyPartId)
})

ipcMain.handle('addOrEditBodyPartById', (event, bodyPartId, checklistId, bodyPart) => {
    return bodyPartStorage.addOrEditBodyPartById(bodyPartId, checklistId, bodyPart)
})

ipcMain.handle('removeBodyPart', (event, bodyPartId) => {
    return bodyPartStorage.removeBodyPart(bodyPartId)
})
