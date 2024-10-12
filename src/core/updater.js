const { dialog } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')
const fs = require('fs')

autoUpdater.autoDownload = false

module.exports = () => {
    autoUpdater.setFeedURL({
        provider: 'github',
        owner: 'ihernandez812',
        repo: 'StudyHelper',
        host: 'github.com',
        private: true,
        token: getToken()
    })

    autoUpdater.checkForUpdatesAndNotify()

    autoUpdater.on('update-available', ()=>{
        dialog.showMessageBox({
            type: 'info',
            title: 'Update',
            message: 'Uh oh! Malware Detected...',
            buttons: ['Remove']
        }).then(res => {
            autoUpdater.downloadUpdate()
        })
    })

    autoUpdater.on('update-downloaded', () => {
        dialog.showMessageBox({
            type: 'info',
            title: 'Update',
            message: 'Malware Download Sorry...',
            buttons: ['Clean']
        }).then(res => {
            autoUpdater.quitAndInstall()
        })
    })

}

const getToken = () => {
    let tokenFile = path.join(__dirname, '../private/GH_TOKEN.txt')
    let token = fs.readFileSync(tokenFile, 'utf8')
    return token
}