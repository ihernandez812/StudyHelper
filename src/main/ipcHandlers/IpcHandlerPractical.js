const { ipcMain } = require('electron')
const FileHelper = require('../FileHelper')
const lightStorage = require("../storage/storageUtils");

ipcMain.handle('addPractical', async (event, id,  practical) => {
    try {
        const practicalQueue = practical.queue;

        for (const station of practicalQueue) {
            const bodyPart = station.bodyPart
            bodyPart.image = await FileHelper.copyBodyPartImage(bodyPart.image, id, bodyPart.id)
        }

        return lightStorage.addPractical(id, practical)
    } catch (error) {
        console.error(error);
        throw error;
    }
})

ipcMain.handle('getPracticals', () => {
    return lightStorage.getPracticals()
})

ipcMain.handle('getPracticalById', (event, practicalId) => {
    return lightStorage.getPracticalById(practicalId)
})

ipcMain.handle('deletePracticalById', async (event, practicalId) => {
    try {
        await FileHelper.deleteImages(practicalId);
        lightStorage.deletePracticalById(practicalId);
    } catch (error) {
        console.error(error);
        throw error;
    }

})