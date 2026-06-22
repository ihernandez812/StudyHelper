const Store = require('electron-store')
const localStorage = new Store()

//Need to store checklist and categories in here
//During upgrade tasks we need to set the checklist to here
const setChecklists = (checklists) => {
    localStorage.set('checklists', checklists)
}

const addOrEditChecklistById =  (id, checklist) => {
    let key = id ?? crypto.randomUUID()
    localStorage.set(`checklists.${key}`, { ...checklist, id: key})
    return key
}

const getChecklists = () => {
    return localStorage.get('checklists', {})
}

const getChecklistById = (id) => {
    return localStorage.get(`checklists.${id}`, {})
}

const deleteChecklistById = (id) => {
    localStorage.delete(`checklists.${id}`)
}

const getBodyPartById = (bodyPartId, checklistId) => {
    return localStorage.get(`checklists.${checklistId}.bodyParts.${bodyPartId}`, {})
}

const addOrEditBodyPartById = (bodyPartId, checklistId, bodyPart) => {
    let key = bodyPartId ?? crypto.randomUUID()
    localStorage.set(`checklists.${checklistId}.bodyParts.${key}`, { ...bodyPart, id: key })
    return key
}

const removeBodyPart = (bodyPartId, checklistId) => {
    localStorage.delete(`checklists.${checklistId}.bodyParts.${bodyPartId}`)
}

//During upgrade tasks we need to set the categories here
const setCategories = (categories) => {
    localStorage.set('categories', categories)
}

const getCategories = () => {
    return localStorage.get('categories', {})
}

const getCategoryById = (id) => {
    return localStorage.get(`categories.${id}`, {})
}

const removeCategory = (id) => {
    localStorage.delete(`categories.${id}`)
}

const addOrEditCategoryById = (id, category) => {
    let key = id ?? crypto.randomUUID()
    localStorage.set(`categories.${key}`, {...category, id: key})
    return key
}

const checkSearchInput = (possibleValue, query) => {
    let result = false
    possibleValue = possibleValue.toLowerCase()
    query = query.toLowerCase()

    if(query && query.length > 0){
        if(query.length >= 3){
            if(possibleValue.includes(query)){
                result = true
            }
        } else{
            if(possibleValue.startsWith(query)){
                result = true
            }
        }
    }

    return result
}

const addPractical = (practical) => {
    let id = crypto.randomUUID()
    localStorage.set(`practicals.${id}`, { ...practical, id: id })
    return id
}

const getPracticals = () => {
    return localStorage.get('practicals')
}

const getPracticalById = (practicalId) => {
    return localStorage.get(`practicals.${practicalId}`, {})
}

const getIsDarkMode = () => {
    return localStorage.get('isDarkMode', false)
}

const setIsDarkMode = (isDarkMode) => {
    localStorage.set('isDarkMode', isDarkMode)
}

const search = (isChecklistFilterChecked, isBodyPartFilterChecked, isBodyTagFilterChecked, searchQuery) => {
    let checklists = localStorage.get('checklists', {})
    let foundChecklists = {}
    let foundBodyParts = {}
    let foundBodyTags = {}

    for(let checklistId in checklists){
        let checklist = checklists[checklistId]
        let checklistName = checklist['name']

        if(isChecklistFilterChecked && checkSearchInput(checklistName, searchQuery)){
            foundChecklists[checklistId] = checklistName
        }
        let bodyParts = checklist['bodyParts']

        for(let bodyPartId in bodyParts){
            let bodyPart = bodyParts[bodyPartId]
            let bodyPartName = bodyPart['name']

            if(isBodyPartFilterChecked && checkSearchInput(bodyPartName, searchQuery)){
                let key = `${checklistId}_ ${bodyPartId}`
                foundBodyParts[key] = `${bodyPartName} - ${checklistName}`
            }
            let bodyTags = bodyPart['coordinates']

            for(let bodyTagId in bodyTags){
                let bodyTag = bodyTags[bodyTagId]
                let bodyTagName = bodyTag['name']

                if(isBodyTagFilterChecked && checkSearchInput(bodyTagName, searchQuery)){
                    let key = `${checklistId}_ ${bodyPartId}`
                    foundBodyTags[key] = `${bodyTagName} - ${bodyPartName}`
                }
            }
        }
    }

    return {
        checklists: foundChecklists,
        bodyParts: foundBodyParts,
        bodyTags: foundBodyTags
    }

}

module.exports = {
    setChecklists,
    addOrEditChecklistById, 
    getChecklists,
    getChecklistById,
    deleteChecklistById,
    getBodyPartById,
    addOrEditBodyPartById,
    removeBodyPart,
    setCategories,
    getCategories,
    getCategoryById,
    removeCategory,
    addOrEditCategoryById,
    search,
    addPractical,
    getPracticals,
    getPracticalById,
    getIsDarkMode,
    setIsDarkMode,
}
