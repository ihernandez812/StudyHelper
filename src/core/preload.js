const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld(
    'api', {
        popup: async (message) => {
            return ipcRenderer.invoke('popup', message)
            
        },
        dialogQuestion: async (message) => {
            return ipcRenderer.invoke('dialogQuestion', message)
            
        },
        addChecklistAndCategoriesToDB: () => {
            let unparsedChecklists = localStorage.getItem('checklists')
            let unparsedCategories = localStorage.getItem('categories')
            
            let checklists = JSON.parse(unparsedChecklists) || {}
            let categories = JSON.parse(unparsedCategories) || {}
            if(checklists){
                ipcRenderer.invoke('setChecklists', checklists)
            }
            if(categories){
                ipcRenderer.invoke('setCategories', categories)
            }
        },
        addOrEditChecklistById:  (id, checklist) => {
            ipcRenderer.invoke('addOrEditChecklistById', id, checklist)
        },
        getBodyPartById: (bodyPartId, checklistId) => {
            return ipcRenderer.invoke('getBodyPartById', bodyPartId, checklistId)
        },
        addOrEditBodyPartById: (bodyPartId, checklistId, bodyPart) => {
            ipcRenderer.invoke('addOrEditBodyPartById', bodyPartId, checklistId, bodyPart)
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
        addOrEditCategoryById: (id, category) => {
            return ipcRenderer.invoke('addOrEditCategoryById', id, category)
        },
        addPractical: (id, practical) => {
            ipcRenderer.invoke('addPractical', id, practical)
        },
        getPracticals: () => {
            return ipcRenderer.invoke('getPracticals')
        },
        getPractialById: (id) => {
            return ipcRenderer.invoke('getPracticalById', id)
        },
        loadChecklistTest: () => {
            ipcRenderer.invoke('loadChecklistTester')
        }, 
        reloadHome: () => {
            ipcRenderer.invoke('reloadHome')
        },
        generateId: async () => {
            let id = await ipcRenderer.invoke('generateId')
            return id
        },
        //Essentially these are upgrade tasks. Could be compressed into one, but there were
        //part of two different items so they are not
        addIdsToChecklists: async () => {
            let checklists = JSON.parse(localStorage.getItem('checklists'))
            if(checklists){
                let sanatizedChecklists = await ipcRenderer.invoke('addIdsToChecklists', checklists)
                if(sanatizedChecklists){
                    localStorage.setItem('checklists', JSON.stringify(sanatizedChecklists))
                }
            }
        },
        addIdsToTags: async () => {
            let checklists = JSON.parse(localStorage.getItem('checklists'))
            if(checklists){
                let sanatizedChecklists = await ipcRenderer.invoke('addIdsToTags', checklists)
                if(sanatizedChecklists){
                    localStorage.setItem('checklists', JSON.stringify(sanatizedChecklists))
                }
            }
        },
        setCurrChecklist: (id) => {
            localStorage.setItem('currChecklist', id)
        },
        getCurrChecklist: () => {
            return localStorage.getItem('currChecklist')
        },
        clearCurrChecklist: () => {
            localStorage.removeItem('currChecklist')
        },
        setCurrBodyPart: (bodyPart) => {
            localStorage.setItem('currBodyPart', JSON.stringify(bodyPart))
        },
        getCurrBodyPart: () => {
            return JSON.parse(localStorage.getItem('currBodyPart'))
        },
        clearCurrBodyPart: () => {
            localStorage.removeItem('currBodyPart')
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
        }
})
