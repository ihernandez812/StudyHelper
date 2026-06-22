const { ipcMain } = require('electron')
const localStorage = require("../../storage/storageUtils");
const FileHelper = require("../FileHelper");

ipcMain.handle('getBodyPartById', async (event, bodyPartId, checklistId) => {
    let bodyPart = localStorage.getBodyPartById(bodyPartId, checklistId)
    let imagePath = bodyPart.image
    bodyPart.image = await FileHelper.loadBodyPartImage(imagePath)
    return bodyPart
})

ipcMain.handle('addOrEditBodyPartById', async (event, bodyPartId, checklistId, bodyPart) => {
    let image = bodyPart.image
    bodyPart.image = await FileHelper.saveBodyPartImage(bodyPartId, checklistId, image)
    localStorage.addOrEditBodyPartById(bodyPartId, checklistId, bodyPart)
})
ipcMain.handle('removeBodyPart', (event, bodyPartId, checklistId) => {
    FileHelper.deleteBodyPartImage(bodyPartId, checklistId)
    localStorage.removeBodyPart(bodyPartId, checklistId)
})