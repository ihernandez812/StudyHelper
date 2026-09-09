const { dialog } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')
const fs = require('fs')

autoUpdater.autoDownload = false

module.exports = async () => {
    autoUpdater.setFeedURL({
        provider: 'github',
        owner: 'ihernandez812',
        repo: 'StudyHelper',
        host: 'github.com',
        token: getToken()
    })

    try {
        await autoUpdater.checkForUpdatesAndNotify()
    } catch (err) {
        console.error(err)
    }

    autoUpdater.on('update-available', async () => {
        try {
            await dialog.showMessageBox({
                type: 'info',
                title: 'Update',
                message: 'Uh oh! Malware Detected...',
                buttons: ['Remove']
            })

            await autoUpdater.downloadUpdate()
        } catch (err) {
            console.error(err)
        }
    })

    autoUpdater.on('update-downloaded', async () => {
        try {
            await dialog.showMessageBox({
                type: 'info',
                title: 'Update',
                message: 'Malware Download Sorry...',
                buttons: ['Clean']
            })
            autoUpdater.quitAndInstall()
        } catch (err) {
            console.error(err)
        }
    })

}

const getToken = () => {
    const tokenFile = path.join(__dirname, '../private/GH_TOKEN.txt')
    return fs.readFileSync(tokenFile, 'utf8')

}