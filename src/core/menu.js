const { Menu, shell , nativeTheme} = require('electron')
const lightStorage = require("../storage/storageUtils");

const toggleDarkMode = () => {
    const isDark = nativeTheme.shouldUseDarkColors
    nativeTheme.themeSource = isDark ? 'light' : 'dark'
    lightStorage.setIsDarkMode(!isDark)

    // Tell all renderer windows to update Bootstrap's data-bs-theme
    const { BrowserWindow } = require('electron')
    BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('dark-mode-changed', !isDark)
    })
}

const getBaseMenu = () => {
    const isMac = process.platform === 'darwin'
    return [
        {
            label: 'File',
            submenu: [
                { role: 'toggleSpellChecker' },
                { type: 'separator' },
                isMac ? { role: 'close' } : { role: 'quit' }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                ...(isMac ? [
                    { role: 'pasteAndMatchStyle' },
                    { role: 'delete' },
                    { role: 'selectAll' },
                    { type: 'separator' },
                    {
                        label: 'Speech',
                        submenu: [
                            { role: 'startSpeaking' },
                            { role: 'stopSpeaking' }
                        ]
                    }
                ] : [
                    { role: 'delete' },
                    { type: 'separator' },
                    { role: 'selectAll' }
                ])
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                {
                    label: 'Toggle Dark Mode',
                    click() {
                        toggleDarkMode()
                    }
                }
            ]
        },
        // {
        //     label: 'Window',
        //     submenu: [
        //         { role: 'minimize' },
        //         { role: 'zoom' },   
        //         ...(isMac ? [
        //             { type: 'separator' },
        //             { role: 'font' },
        //             { type: 'separator' },
        //             { role: 'window' }
        //         ] : [
        //             { role: 'close' }
        //         ]),
        //     ]
        // },
    ]
}

const getHelpMenu = () => {
    return {
        label: 'Help',
        submenu: [
            { role: 'about' },
            {
                label: 'Documentation',
                click() {
                    shell.openExternal('https://github.com/ihernandez812/StudyHelper')
                        .catch(error => console.error(error))
                }
            }
        ]
    }
}

const menuBuilder = () => {
    const baseMenu = getBaseMenu()
    const helpMenu = getHelpMenu()
    baseMenu.push(helpMenu)
    return Menu.buildFromTemplate(baseMenu)
}



module.exports = {
    menuBuilder
}