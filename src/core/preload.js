const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld(
    'api', {
    addChecklist:  (checklist) => {
        let checklists = JSON.parse(localStorage.getItem('checklists')) || []
        checklists.push(checklist)
        localStorage.setItem('checklists', JSON.stringify(checklists))
        
    },
    getChecklists: () => {
        return JSON.parse(localStorage.getItem('checklists')) || []
    },
    setCurrBodyPart: (bodyPart) => {
        localStorage.setItem('currBodyPart', JSON.stringify(bodyPart))
    },
    getCurrBodyPart: () => {
        return JSON.parse(localStorage.getItem('currBodyPart')) || {}
    },
    loadChecklistTest: () => {
        console.log('inhere')
        ipcRenderer.invoke('loadChecklistTester','here')
    }
    
}
)
