const { ipcMain } = require('electron')
const { settingKeys, getSetting } = require('../storage/settingsStorage')

ipcMain.handle('getDarkMode', () => {
    return getSetting(settingKeys.IS_DARK_MODE, false)
})
