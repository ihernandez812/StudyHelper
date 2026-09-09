const { app } = require('electron')
const { createWindow } = require('./WindowFactory')
const { filePaths } = require('./WindowConstants')
const { menuBuilder } = require('./menu')
require('./ipcHandlers/IpcHandlerBase')
require('./ipcHandlers/IpcHandlerBodyPart')
require('./ipcHandlers/IpcHandlerCategory')
require('./ipcHandlers/IpcHandlerChecklist')
require('./ipcHandlers/IpcHandlerPractical')
require('./ipcHandlers/IpcHandlerUpgradeTasks')
require('./ipcHandlers/IpcHandlerWindow')




//app.disableHardwareAcceleration();

app.on('ready', () => {
    const menu = menuBuilder()
    const options = {
        menu: menu,
    }

    createWindow(filePaths.home, options)
})

app.on('window-all-closed', () => {
    app.quit()
})

