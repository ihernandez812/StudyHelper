const { ipcMain } = require('electron')
const lightStorage = require("../storage/storageUtils");
const FileHelper = require("../FileHelper");

ipcMain.handle('getBodyPartById', async (event, bodyPartId, checklistId) => {
    return lightStorage.getBodyPartById(bodyPartId, checklistId)
})

ipcMain.handle('addOrEditBodyPartById', async (event, bodyPartId, checklistId, bodyPart) => {
    try {
        const image = bodyPart.image

        if (typeof image === 'string' && image.startsWith('data:image/')) {
            bodyPart.image = await FileHelper.saveBodyPartImage(checklistId, bodyPartId, image)
        } else {
            //No new image was supplied, so keep the one already on disk
            bodyPart.image = lightStorage.getBodyPartById(bodyPartId, checklistId)['image']
        }

        return lightStorage.addOrEditBodyPartById(bodyPartId, checklistId, bodyPart)
    } catch (error) {
        console.error(error);
        throw error;
    }
})

ipcMain.handle('removeBodyPart', async (event, bodyPartId, checklistId) => {
    try {
        await FileHelper.deleteBodyPartImage(checklistId, bodyPartId)
        lightStorage.removeBodyPart(bodyPartId, checklistId)
    } catch (error) {
        console.error(error);
        throw error;
    }
})