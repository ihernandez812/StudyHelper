const { ipcMain } = require('electron')
const localStorage = require("../../storage/storageUtils");
const FileHelper = require("../FileHelper");

ipcMain.handle('getBodyPartById', async (event, bodyPartId, checklistId) => {
    return localStorage.getBodyPartById(bodyPartId, checklistId)
})

ipcMain.handle('addOrEditBodyPartById', async (event, bodyPartId, checklistId, bodyPart) => {
    let image = bodyPart.image

    if (typeof image === 'string' && image.startsWith('data:image/')) {
        bodyPart.image = await FileHelper.saveBodyPartImage(checklistId, bodyPartId, image)
    } else {
        //No new image was supplied, so keep the one already on disk
        bodyPart.image = localStorage.getBodyPartById(bodyPartId, checklistId)['image']
    }

    return localStorage.addOrEditBodyPartById(bodyPartId, checklistId, bodyPart)
})

ipcMain.handle('removeBodyPart', (event, bodyPartId, checklistId) => {
    FileHelper.deleteBodyPartImage(checklistId, bodyPartId)
    localStorage.removeBodyPart(bodyPartId, checklistId)
})