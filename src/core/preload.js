const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld(
    'api', {
    addChecklist:  (id, checklist) => {
        let checklists = JSON.parse(localStorage.getItem('checklists')) || {}
        checklists[id] = checklist
        console.log(checklists)
        localStorage.setItem('checklists', JSON.stringify(checklists))
        
        
    },
    //Simply here for debuging purpose. When testing actual build I don't want the 
    //previous checklist to get screwed up so in case it does save it so we have
    //something to rollback to.
    saveChecklistCopy: () => {
        let checklists = JSON.parse(localStorage.getItem('checklists')) || {}
        localStorage.setItem('checklistsCopy', JSON.stringify(checklists))
        
    },
    getChecklistByBodyPartId: (id) => {
        let checklists = JSON.parse(localStorage.getItem('checklists')) || {}
        let checklist = {}
        let checklistId = null
        for(let key in checklists){
            let possibleChecklist = checklists[key]
            let bodyParts = possibleChecklist['bodyParts']
            if(bodyParts[id]){
                checklist = possibleChecklist
                checklistId = key
            }
        }
        return [checklist, checklistId]
    },
    getChecklists: () => {
        return JSON.parse(localStorage.getItem('checklists')) || {}
    },
    setCurrBodyPart: (bodyPart) => {
        localStorage.setItem('currBodyPart', JSON.stringify(bodyPart))
    },
    setEditBodyPart: (bodyPart) => {
        localStorage.setItem('editBodyPart', JSON.stringify(bodyPart))
    },
    getEditBodyPart: () => {
       return JSON.parse(localStorage.getItem('editBodyPart'))
    },
    clearEditBodyPart: () => {
        localStorage.removeItem('editBodyPart')
    },
    getCurrBodyPart: () => {
        return JSON.parse(localStorage.getItem('currBodyPart')) || {}
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
    loadEditChecklist: () => {
        ipcRenderer.invoke('loadEditChecklist')
    }
    
}
)
