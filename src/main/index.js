const { app, dialog, protocol, net } = require('electron')
const log = require('electron-log/main')
const { pathToFileURL } = require('url')
const path = require('path')
const { absolutePathForKey, imagesDirectory } = require('./FileHelper')
const { createWindow } = require('./WindowFactory')
const { filePaths } = require('./WindowConstants')
const { menuBuilder } = require('./menu')
const { checkForUpdates } = require('./updater')
const { runUpgrades } = require('./upgrades/upgradeFactory')
const { closeAnatomeDatabase } = require('./storage/anatomeDatabase')

require('./ipcHandlers/IpcHandlerBase')
require('./ipcHandlers/IpcHandlerBodyPart')
require('./ipcHandlers/IpcHandlerCategory')
require('./ipcHandlers/IpcHandlerChecklist')
require('./ipcHandlers/IpcHandlerPractical')
require('./ipcHandlers/IpcHandlerWindow')




//Must run before the ready event or the scheme is treated as unknown.
protocol.registerSchemesAsPrivileged([
    { scheme: 'media', privileges: { standard: true, secure: true, supportFetchAPI: true } },
])

app.on('ready', async () => {
    //media://images/checklists/<checklistId>/<bodyPartId>/image.png
    //A fixed host keeps every id in the pathname. Hostnames are lowercased by
    //URL parsing, so ids must never be used as the host.
    protocol.handle('media', (request) => {
        const { hostname, pathname } = new URL(request.url)

        if (hostname !== 'images') {
            return new Response('Not found', { status: 404 })
        }

        const key = decodeURIComponent(pathname.slice(1))
        const absolutePath = path.resolve(absolutePathForKey(key))

        //Containment: a key like ../../../etc/passwd must never escape imagesDirectory
        if (!absolutePath.startsWith(path.resolve(imagesDirectory) + path.sep)) {
            return new Response('Forbidden', { status: 403 })
        }

        //no-store so a replaced image isn't served from cache at the same URL
        return net.fetch(pathToFileURL(absolutePath).toString(), {
            headers: { 'Cache-Control': 'no-store' },
        })
    })

    try {
        await runUpgrades()
    } catch (error) {
        log.error(error)
        dialog.showErrorBox('AnatoMe', `AnatoMe could not update its data and needs to close.\n\n${error.message}`)
        app.quit()
        return
    }

    const menu = menuBuilder()
    const options = {
        menu: menu,
    }

    createWindow(filePaths.home, options)
    checkForUpdates().catch(error => console.error(error))
})

app.on('window-all-closed', () => {
    app.quit()
})

app.on('will-quit', () => {
    closeAnatomeDatabase()
})

