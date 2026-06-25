const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld(
    'api', {
        popup: async (message) => {
            return ipcRenderer.invoke('popup', message)
            
        },
        dialogQuestion: async (message) => {
            return ipcRenderer.invoke('dialogQuestion', message)
            
        },
        addOrEditChecklistById: async (id=null, checklist) => {
            return await ipcRenderer.invoke('addOrEditChecklistById', id, checklist)
        },
        deleteChecklistById:  (id) => {
          ipcRenderer.invoke('deleteChecklistById', id)
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
            ipcRenderer.invoke('removeBodyPart', bodyPartId, checklistId)
        },
        getCategories: () => {
            return ipcRenderer.invoke('getCategories')

        },
        getCategoryById: (id) => {
            return ipcRenderer.invoke('getCategoryById', id)
        },
        removeCategory: (id) => {
            ipcRenderer.invoke('removeCategory', id)
        },
        addOrEditCategoryById: (id=null, category) => {
            console.log(category)
            return ipcRenderer.invoke('addOrEditCategoryById', id, category)
        },
        addPractical: (id, practical) => {
            ipcRenderer.invoke('addPractical', id, practical)
        },
        getPracticals: () => {
            return ipcRenderer.invoke('getPracticals')
        },
        getPracticalById: (id) => {
            return ipcRenderer.invoke('getPracticalById', id)
        },
        loadChecklistTest: () => {
            ipcRenderer.invoke('loadChecklistTester')
        }, 
        reloadHome: () => {
            ipcRenderer.invoke('reloadHome')
        },
        loadConfigBodyPart: () => {
            ipcRenderer.invoke('loadConfigBodyPart')
        },
        closeConfig: () => {
            ipcRenderer.invoke('closeConfig')
        },
        closePracticalTest: () => {
            ipcRenderer.invoke('closePracticalTest')
        }, 
        search: (isChecklistFilterChecked, isBodyPartFilterChecked, isBodyTagFilterChecked, searchQuery) => {
            return ipcRenderer.invoke('search', isChecklistFilterChecked, isBodyPartFilterChecked, isBodyTagFilterChecked, searchQuery)
        },
        getDarkMode: () => {
            return ipcRenderer.invoke('getDarkMode')
        },
        onDarkModeChanged: (callback) => {
            ipcRenderer.on('dark-mode-changed', (_event, isDark) => callback(isDark))
        }
})
