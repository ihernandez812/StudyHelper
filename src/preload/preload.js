const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld(
    'api', {
        checkForUpdates: () => {
            return ipcRenderer.invoke('checkForUpdates')
        },
        downloadUpdate: () => {
            return ipcRenderer.invoke('downloadUpdate')
        },
        installUpdate: () => {
            return ipcRenderer.invoke('installUpdate')
        },
        onUpdateAvailable: (callback) => {
            ipcRenderer.on('update-available', (_event, info) => callback(info))
        },
        onUpdateDownloadProgress: (callback) => {
            ipcRenderer.on('update-download-progress', (_event, progress) => callback(progress))
        },
        onUpdateDownloaded: (callback) => {
            ipcRenderer.on('update-downloaded', () => callback())
        },
        onUpdateError: (callback) => {
            ipcRenderer.on('update-error', () => callback())
        },
        addOrEditChecklistById: (id=null, checklist) => {
            return ipcRenderer.invoke('addOrEditChecklistById', id, checklist)
        },
        deleteChecklistById:  (id) => {
          return ipcRenderer.invoke('deleteChecklistById', id)
        },
        getBodyPartById: (bodyPartId) => {
            return ipcRenderer.invoke('getBodyPartById', bodyPartId)
        },
        addOrEditBodyPartById: (bodyPartId, checklistId, bodyPart) => {
            return ipcRenderer.invoke('addOrEditBodyPartById', bodyPartId, checklistId, bodyPart)
        },
        getChecklists: () => {
            return ipcRenderer.invoke('getChecklists')
        },
        getChecklistById: (id) => {
            return ipcRenderer.invoke('getChecklistById', id)
        },   
        removeBodyPart: (bodyPartId) => {
            return ipcRenderer.invoke('removeBodyPart', bodyPartId)
        },
        getCategories: () => {
            return ipcRenderer.invoke('getCategories')

        },
        getCategoryById: (id) => {
            return ipcRenderer.invoke('getCategoryById', id)
        },
        removeCategory: (id) => {
            return ipcRenderer.invoke('removeCategory', id)
        },
        addOrEditCategoryById: (id=null, category) => {
            return ipcRenderer.invoke('addOrEditCategoryById', id, category)
        },
        addPractical: (practical) => {
            return ipcRenderer.invoke('addPractical', practical)
        },
        getPracticals: () => {
            return ipcRenderer.invoke('getPracticals')
        },
        getPracticalById: (id) => {
            return ipcRenderer.invoke('getPracticalById', id)
        },
        deletePracticalById: (id) => {
           return ipcRenderer.invoke('deletePracticalById', id)
        },
        getDarkMode: () => {
            return ipcRenderer.invoke('getDarkMode')
        },
        onDarkModeChanged: (callback) => {
            ipcRenderer.on('dark-mode-changed', (_event, isDark) => callback(isDark))
        }
})
