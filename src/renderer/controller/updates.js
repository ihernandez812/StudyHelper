// Update flow: main pushes updater events, this shows the dialogs and toasts.
import {confirmDialog} from "../HTMLUtils/confirmDialog.js"
import {showToast, showProgressToast} from "../HTMLUtils/toast.js"
import {TOAST_TYPE} from "../enums/toastType.js"

// Set while a download is running so progress events have a toast to update
let progressToast = null

const closeProgressToast = () => {
    if (progressToast) {
        progressToast.close()
        progressToast = null
    }
}

const onUpdateAvailable = async ({ version }) => {
    const confirmed = await confirmDialog({
        title:        'Update available',
        message:      `Version ${version} of AnatoMe is available. Download it now?`,
        confirmLabel: 'Download',
        cancelLabel:  'Later',
    })

    if (!confirmed) {
        return
    }

    progressToast = showProgressToast(`Downloading update ${version}…`)
    await window.api.downloadUpdate()
}

const onUpdateDownloadProgress = ({ percent }) => {
    if (progressToast) {
        progressToast.update(percent, `Downloading update… ${Math.round(percent)}%`)
    }
}

const onUpdateDownloaded = async () => {
    closeProgressToast()

    const confirmed = await confirmDialog({
        title:        'Update ready',
        message:      'The update is ready. Restart AnatoMe now to install it?\nIf you choose Later it will install the next time you quit.',
        confirmLabel: 'Restart',
        cancelLabel:  'Later',
    })

    if (confirmed) {
        await window.api.installUpdate()
    }
}

const onUpdateError = () => {
    // A failed background check isn't worth interrupting for; only a download the user asked for is
    if (!progressToast) {
        return
    }

    closeProgressToast()
    showToast(TOAST_TYPE.FAIL, 'The update could not be downloaded. Try again next launch.')
}

const startUpdateCheck = () => {
    window.api.onUpdateAvailable(onUpdateAvailable)
    window.api.onUpdateDownloadProgress(onUpdateDownloadProgress)
    window.api.onUpdateDownloaded(onUpdateDownloaded)
    window.api.onUpdateError(onUpdateError)

    window.api.checkForUpdates().catch(error => console.error(error))
}

export {
    startUpdateCheck,
}
