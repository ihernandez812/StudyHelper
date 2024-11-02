const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld(
    'api', {
        dialogQuestion: async (message) => {
            return ipcRenderer.invoke('dialogQuestion', message)
            
        },
        addChecklist:  (id, checklist) => {
            let checklists = JSON.parse(localStorage.getItem('checklists')) || {}
            checklists[id] = checklist
            localStorage.setItem('checklists', JSON.stringify(checklists))
            
            
        },
        //Simply here for debuging purpose. When testing actual build I don't want the 
        //previous checklist to get screwed up so in case it does save it so we have
        //something to rollback to.
        saveChecklistCopy: () => {
            let checklists = JSON.parse(localStorage.getItem('checklists')) || {}
            localStorage.setItem('checklistsCopy', JSON.stringify(checklists))
            
        },
        getBodyPartById: (bodyPartId, checklistId) => {
            let checklists = JSON.parse(localStorage.getItem('checklists')) || {}
            let checklist = checklists[checklistId]
            let bodyParts = checklist['bodyParts']
            return bodyParts[bodyPartId]
        },
        addOrEditBodyPartById: (bodyPartId, checklistId, bodyPart) => {
            let checklists = JSON.parse(localStorage.getItem('checklists')) || {}
            let checklist = checklists[checklistId]
            let bodyParts = checklist['bodyParts']
            bodyParts[bodyPartId] = bodyPart
            localStorage.setItem('checklists', JSON.stringify(checklists))
        },
        getChecklists: () => {
            return JSON.parse(localStorage.getItem('checklists')) || {}
        },
        getChecklistById: (key) => {
            let checklists = JSON.parse(localStorage.getItem('checklists')) || {}
            return checklists[key]
        },
        setCurrChecklist: (key) => {
            localStorage.setItem('currChecklist', key)
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
        setEditBodyPart: (key) => {
            localStorage.setItem('editBodyPart', key)
        },
        getEditBodyPart: () => {
            return localStorage.getItem('editBodyPart')
        },
        clearEditBodyPart: () => {
            localStorage.removeItem('editBodyPart')
        },
        getCurrBodyPart: () => {
            return JSON.parse(localStorage.getItem('currBodyPart')) || {}
        },
        removeBodyPart: (key, checklistKey) => {
            let checklists = JSON.parse(localStorage.getItem('checklists'))
            let checklist = checklists[checklistKey]
            let bodyParts = checklist['bodyParts']
            delete bodyParts[key]

            localStorage.setItem('checklists', JSON.stringify(checklists))
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
        loadConfigBodyPart: () => {
            ipcRenderer.invoke('loadConfigBodyPart')
        },
        closeConfig: () => {
            ipcRenderer.invoke('closeConfig')
        }
        
}
)
