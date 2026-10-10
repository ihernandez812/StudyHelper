const { ipcMain } = require('electron')
const practicalStorage = require('../storage/practicalStorage')

ipcMain.handle('addPractical', (event, practical) => {
    return practicalStorage.addPractical(practical)
})

ipcMain.handle('getPracticals', () => {
    return practicalStorage.getPracticals()
})

ipcMain.handle('getPracticalById', (event, practicalId) => {
    return practicalStorage.getPracticalById(practicalId)
})

ipcMain.handle('deletePracticalById', (event, practicalId) => {
    return practicalStorage.deletePracticalById(practicalId)
})
