const { ipcMain } = require('electron')
const FileHelper = require('../FileHelper')
const localStorage = require("../../storage/storageUtils");

ipcMain.handle('addPractical', async (event, id,  practical) => {
    let practicalQueue = practical.queue;

    for (const station of practicalQueue) {
        let bodyPart = station.bodyPart
        bodyPart.image = await FileHelper.copyBodyPartImage(bodyPart.image, id, bodyPart.id)
    }

    return localStorage.addPractical(id, practical)
})

ipcMain.handle('getPracticals', (event) => {
    return localStorage.getPracticals()
})

ipcMain.handle('getPracticalById', (event, practicalId) => {
    return localStorage.getPracticalById(practicalId)
})

ipcMain.handle('deletePracticalById', (event, practicalId) => {
    FileHelper.deleteImages(practicalId)
    localStorage.deletePracticalById(practicalId)
})