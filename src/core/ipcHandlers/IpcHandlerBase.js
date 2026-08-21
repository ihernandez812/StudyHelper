const { ipcMain} = require('electron');
const localStorage = require("../../storage/storageUtils");


ipcMain.handle('search', (event, isChecklistFilterChecked, isBodyPartFilterChecked, isBodyTagFilterChecked, searchQuery) => {
    return localStorage.search(isChecklistFilterChecked, isBodyPartFilterChecked, isBodyTagFilterChecked, searchQuery)
})

ipcMain.handle('getDarkMode', () => {
    return localStorage.getIsDarkMode()
})




