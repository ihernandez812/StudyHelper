const { dialog } = require('electron')
const { autoUpdater } = require('electron-updater')

autoUpdater.autoDownload = false

module.exports = async () => {
    autoUpdater.setFeedURL({
        provider: 'github',
        owner: 'ihernandez812',
        repo: 'StudyHelper',
        host: 'github.com',
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
                message: 'A new version of AnatoMe is available. Download it now?',
                buttons: ['Download', 'Later']
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
                message: 'The update is ready. AnatoMe will restart to install it.',
                buttons: ['Restart']
            })
            autoUpdater.quitAndInstall()
        } catch (err) {
            console.error(err)
        }
    })

}
