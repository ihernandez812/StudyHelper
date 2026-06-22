const { ipcMain, dialog} = require('electron');
const { createWindow, reloadWindow, closeWindow, getWindow} = require('../WindowFactory');
const { filePaths } = require('../WindowConstants');


ipcMain.handle('popup', (event, message) => {
    let win = getWindow(filePaths.home);

    dialog.showMessageBox(win, {
        title: 'Study Helper',
        message: message,
    }).catch((err) => {
        console.error(err);
    })
})

ipcMain.handle('dialogQuestion', async (event, message) => {
    let win = getWindow(filePaths.home);

    return await dialog.showMessageBox(win,{
        type: 'info',
        title: 'Update',
        message: message,
        buttons: ['Yes', 'No']
    }).catch((err) => {
        console.error(err);
    })
})

ipcMain.handle('loadChecklistTester', (event) => {
    let win = getWindow(filePaths.home);
    const options = {
        parent: win
    }

    createWindow(filePaths.index, options)
})

ipcMain.handle('reloadHome', (event) => {
    reloadWindow(filePaths.home)
})

ipcMain.handle('loadConfigBodyPart', (event) => {
    let win = getWindow(filePaths.home);
    const options = {
        parent: win
    }

    createWindow(filePaths.config, options)
})

ipcMain.handle('closeConfig', (event) => {
    closeWindow(filePaths.config)
})

ipcMain.handle('closePracticalTest', (event) => {
   closeWindow(filePaths.practicalTest)
})