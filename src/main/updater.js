const { app, dialog } = require('electron')
const { autoUpdater } = require('electron-updater')
const log = require('electron-log/main')
const { getWindow } = require('./WindowFactory')
const { filePaths } = require('./WindowConstants')

//Logs to ~/Library/Logs/Study Helper/main.log
log.transports.file.level = 'info'
autoUpdater.logger = log
autoUpdater.autoDownload = false

let started = false

const onUpdateAvailable = async (info) => {
    const { response } = await dialog.showMessageBox(getWindow(filePaths.home), {
        type: 'info',
        title: 'Update',
        message: `Version ${info.version} of AnatoMe is available. Download it now?`,
        buttons: ['Download', 'Later'],
        defaultId: 0,
        cancelId: 1,
    })

    if (response === 0) {
        autoUpdater.downloadUpdate().catch(err => log.error(err))
    }
}

//Dock icon progress bar while the update downloads
const onDownloadProgress = (progress) => {
    const win = getWindow(filePaths.home)

    if (win) {
        win.setProgressBar(progress.percent / 100)
    }
}

const clearDownloadProgress = () => {
    const win = getWindow(filePaths.home)

    if (win) {
        win.setProgressBar(-1)
    }
}

const onUpdateDownloaded = async () => {
    clearDownloadProgress()

    const { response } = await dialog.showMessageBox(getWindow(filePaths.home), {
        type: 'info',
        title: 'Update',
        message: 'The update is ready. Restart AnatoMe now to install it?',
        detail: 'If you choose Later it will install the next time you quit.',
        buttons: ['Restart', 'Later'],
        defaultId: 0,
        cancelId: 1,
    })

    if (response === 0) {
        autoUpdater.quitAndInstall()
    }
}

const onUpdateError = (err) => {
    clearDownloadProgress()
    log.error('Auto update failed', err)
}

const checkForUpdates = async () => {
    //Unpackaged runs skip the check unless UPDATER_DEV is set (reads dev-app-update.yml)
    if (started || (!app.isPackaged && !process.env.UPDATER_DEV)) {
        return
    }

    started = true
    autoUpdater.forceDevUpdateConfig = !app.isPackaged

    //Listeners go first, they fire during checkForUpdates
    autoUpdater.on('update-available', onUpdateAvailable)
    autoUpdater.on('download-progress', onDownloadProgress)
    autoUpdater.on('update-downloaded', onUpdateDownloaded)
    autoUpdater.on('error', onUpdateError)

    try {
        await autoUpdater.checkForUpdates()
    } catch (err) {
        log.error(err)
    }
}

module.exports = {
    checkForUpdates,
}
