const { ipcMain } = require('electron')
const categoryStorage = require('../storage/categoryStorage')

ipcMain.handle('getCategories', () => {
    return categoryStorage.getCategories()
})

ipcMain.handle('getCategoryById', (event, categoryId) => {
    return categoryStorage.getCategoryById(categoryId)
})

ipcMain.handle('addOrEditCategoryById', (event, categoryId, category) => {
    return categoryStorage.addOrEditCategoryById(categoryId, category)
})

ipcMain.handle('removeCategory', (event, categoryId) => {
    return categoryStorage.removeCategory(categoryId)
})
