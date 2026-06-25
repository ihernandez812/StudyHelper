const { ipcMain } = require('electron')
const localStorage = require("../../storage/storageUtils");

ipcMain.handle('setCategories', (event, categories) => {
    return localStorage.setCategories(categories)
})
ipcMain.handle('getCategories', (event) => {
    return localStorage.getCategories()
})
ipcMain.handle('getCategoryById', (event, categoryId) => {
    return localStorage.getCategoryById(categoryId)
})
ipcMain.handle('addOrEditCategoryById', (event, categoryId, category) => {
    return localStorage.addOrEditCategoryById(categoryId, category)
})
ipcMain.handle('removeCategory', (event, categoryId) => {
    localStorage.removeCategory(categoryId)
})
