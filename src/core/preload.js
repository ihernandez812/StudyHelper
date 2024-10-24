const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld(
    'api', {
    addChecklist:  (id, checklist) => {
        let checklists = JSON.parse(localStorage.getItem('checklists')) || {}
        checklists[id] = checklist
        console.log(checklists)
        localStorage.setItem('checklists', JSON.stringify(checklists))
        
        
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
    addIdsToChecklists: async () => {
        let checklists = JSON.parse(localStorage.getItem('checklists'))
        if(checklists){
            let sanatizedChecklists = await ipcRenderer.invoke('addIdsToChecklists', checklists)
            console.log(sanatizedChecklists)
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
