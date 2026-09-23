const { app, protocol, net } = require('electron')
const { pathToFileURL } = require('url')
const path = require('path')
const { absPathFor, baseDir } = require('./FileHelper')
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




//Must run before the ready event or the scheme is treated as unknown.
protocol.registerSchemesAsPrivileged([
    { scheme: 'media', privileges: { standard: true, secure: true, supportFetchAPI: true } },
])

app.on('ready', () => {
    //media://images/<checklistId>/<bodyPartId>/image.png
    //A fixed host keeps every id in the pathname. Hostnames are lowercased by
    //URL parsing, and the legacy XXXX-XXXX ids contain uppercase letters.
    protocol.handle('media', (request) => {
        const { hostname, pathname } = new URL(request.url)

        if (hostname !== 'images') {
            return new Response('Not found', { status: 404 })
        }

        const key = decodeURIComponent(pathname.slice(1))
        const abs = path.resolve(absPathFor(key))

        //Containment: a key like ../../../etc/passwd must never escape baseDir
        if (!abs.startsWith(path.resolve(baseDir) + path.sep)) {
            return new Response('Forbidden', { status: 403 })
        }

        //no-store so a replaced image isn't served from cache at the same URL
        return net.fetch(pathToFileURL(abs).toString(), {
            headers: { 'Cache-Control': 'no-store' },
        })
    })


    const menu = menuBuilder()
    const options = {
        menu: menu,
    }

    createWindow(filePaths.home, options)
})

app.on('window-all-closed', () => {
    app.quit()
})

