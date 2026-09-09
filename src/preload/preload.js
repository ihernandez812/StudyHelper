const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld(
    'api', {
        popup: (message) => {
            return ipcRenderer.invoke('popup', message)
            
        },
        dialogQuestion: (message) => {
            return ipcRenderer.invoke('dialogQuestion', message)
            
        },
        addOrEditChecklistById: (id=null, checklist) => {
            return ipcRenderer.invoke('addOrEditChecklistById', id, checklist)
        },
        deleteChecklistById:  (id) => {
          return ipcRenderer.invoke('deleteChecklistById', id)
        },
        getBodyPartById: (bodyPartId, checklistId) => {
            return ipcRenderer.invoke('getBodyPartById', bodyPartId, checklistId)
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
        removeBodyPart: (bodyPartId, checklistId) => {
            return ipcRenderer.invoke('removeBodyPart', bodyPartId, checklistId)
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
        addPractical: (id, practical) => {
            return ipcRenderer.invoke('addPractical', id, practical)
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
