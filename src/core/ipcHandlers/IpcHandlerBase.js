const { ipcMain, dialog} = require('electron');
const { getWindow, createWindow } = require('../WindowFactory');
const { filePaths } = require('../WindowConstants');
const {generateID} = require("id-generator.js");
const localStorage = require("../../storage/storageUtils");


ipcMain.handle('generateId', (event) => {
    return generateID('XXXX-XXXX-XXXX-XXXX', { letters: true, numbers: true })
})

ipcMain.handle('search', (event, isChecklistFilterChecked, isBodyPartFilterChecked, isBodyTagFilterChecked, searchQuery) => {
    return localStorage.search(isChecklistFilterChecked, isBodyPartFilterChecked, isBodyTagFilterChecked, searchQuery)
})

ipcMain.handle('getDarkMode', () => {
    return localStorage.getIsDarkMode()
})




