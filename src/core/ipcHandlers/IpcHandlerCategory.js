const { ipcMain } = require('electron')
const lightStorage = require("../../storage/storageUtils");

ipcMain.handle('setCategories', (event, categories) => {
    return lightStorage.setCategories(categories)
})
ipcMain.handle('getCategories', () => {
    return lightStorage.getCategories()
})
ipcMain.handle('getCategoryById', (event, categoryId) => {
    return lightStorage.getCategoryById(categoryId)
})
ipcMain.handle('addOrEditCategoryById', (event, categoryId, category) => {
    return lightStorage.addOrEditCategoryById(categoryId, category)
})
ipcMain.handle('removeCategory', (event, categoryId) => {
    lightStorage.removeCategory(categoryId)
})
