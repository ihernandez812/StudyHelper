const { ipcMain} = require('electron');
const lightStorage = require("../storage/storageUtils");


ipcMain.handle('search', (event, isChecklistFilterChecked, isBodyPartFilterChecked, isBodyTagFilterChecked, searchQuery) => {
    return lightStorage.search(isChecklistFilterChecked, isBodyPartFilterChecked, isBodyTagFilterChecked, searchQuery)
})

ipcMain.handle('getDarkMode', () => {
    return lightStorage.getIsDarkMode()
})




