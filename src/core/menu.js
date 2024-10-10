const { Menu } = require('electron')

const toggleDarkMode = () => {
    useDarkMode = store.get().darkMode

    if (useDarkMode) {
        store.set({ 'darkMode': false })
        nativeTheme.themeSource = 'light'
    }
    else {
        store.set({ 'darkMode': true })
        nativeTheme.themeSource = 'dark'
    }
}
const getBaseMenu = () => {
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
        {
            label: 'Window',
            submenu: [
                { role: 'minimize' },
                { role: 'zoom' },
                ...(isMac ? [
                    { type: 'separator' },
                    { role: 'font' },
                    { type: 'separator' },
                    { role: 'window' }
                ] : [
                    { role: 'close' }
                ])
            ]
        },
    ]
}

const getHelpMenu = () => {
    return {
        label: 'help',
        submenu: [
            { role: 'about' }
        ]
    }
}

const menuBuilder = (customMeunItems) => {
    let baseMenu = getBaseMenu()
    let helpMenu = getHelpMenu()
    customMeunItems.push(helpMenu)
    baseMenu.push(...customMeunItems)
    return Menu.buildFromTemplate(baseMenu)

}

const isMac = process.platform === 'darwin'

module.exports = menuBuilder