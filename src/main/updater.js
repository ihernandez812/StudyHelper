const { app } = require('electron')
const { autoUpdater } = require('electron-updater')
const log = require('electron-log/main')
const { getWindow } = require('./WindowFactory')
const { filePaths } = require('./WindowConstants')

//Logs to ~/Library/Logs/AnatoMe/main.log
log.transports.file.level = 'info'
autoUpdater.logger = log
autoUpdater.autoDownload = false

//Channels pushed to the home window; controller/updates.js shows the dialogs and toasts
const UPDATE_CHANNEL = {
    AVAILABLE:         'update-available',
    DOWNLOAD_PROGRESS: 'update-download-progress',
    DOWNLOADED:        'update-downloaded',
    ERROR:             'update-error',
}

let started = false

const sendToHome = (channel, payload) => {
    const win = getWindow(filePaths.home)

    if (win) {
        win.webContents.send(channel, payload)
    }
}

const onUpdateAvailable = (info) => {
    sendToHome(UPDATE_CHANNEL.AVAILABLE, { version: info.version })
}

//Dock icon progress bar plus the in-app progress toast
const onDownloadProgress = (progress) => {
    const win = getWindow(filePaths.home)

    if (win) {
        win.setProgressBar(progress.percent / 100)
    }

    sendToHome(UPDATE_CHANNEL.DOWNLOAD_PROGRESS, { percent: progress.percent })
}

const clearDownloadProgress = () => {
    const win = getWindow(filePaths.home)

    if (win) {
        win.setProgressBar(-1)
    }
}

const onUpdateDownloaded = () => {
    clearDownloadProgress()
    sendToHome(UPDATE_CHANNEL.DOWNLOADED)
}

const onUpdateError = (error) => {
    clearDownloadProgress()
    log.error('Auto update failed', error)
    sendToHome(UPDATE_CHANNEL.ERROR)
}

//Called by the renderer once its listeners are registered, so no event fires before it can show it
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
    } catch (error) {
        log.error(error)
    }
}

//Failures reach the renderer through the 'error' listener
const downloadUpdate = async () => {
    try {
        await autoUpdater.downloadUpdate()
    } catch (error) {
        log.error(error)
    }
}

const installUpdate = () => {
    autoUpdater.quitAndInstall()
}

module.exports = {
    checkForUpdates,
    downloadUpdate,
    installUpdate,
}
