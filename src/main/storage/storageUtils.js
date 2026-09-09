const Store = require('electron-store')
const lightStorage = new Store()

//Need to store checklist and categories in here
//During upgrade tasks we need to set the checklist to here
const setChecklists = (checklists) => {
    lightStorage.set('checklists', checklists)
}

const addOrEditChecklistById =  (id, checklist) => {
    const key = id ?? crypto.randomUUID()
    lightStorage.set(`checklists.${key}`, { ...checklist, id: key})
    return key
}

const getChecklists = () => {
    return lightStorage.get('checklists', {})
}

const getChecklistById = (id) => {
    return lightStorage.get(`checklists.${id}`, {})
}

const deleteChecklistById = (id) => {
    lightStorage.delete(`checklists.${id}`)
}

const getBodyPartById = (bodyPartId, checklistId) => {
    return lightStorage.get(`checklists.${checklistId}.bodyParts.${bodyPartId}`, {})
}

const addOrEditBodyPartById = (bodyPartId, checklistId, bodyPart) => {
    const key = bodyPartId ?? crypto.randomUUID()
    lightStorage.set(`checklists.${checklistId}.bodyParts.${key}`, { ...bodyPart, id: key })
    return key
}

const removeBodyPart = (bodyPartId, checklistId) => {
    lightStorage.delete(`checklists.${checklistId}.bodyParts.${bodyPartId}`)
}

//During upgrade tasks we need to set the categories here
const setCategories = (categories) => {
    lightStorage.set('categories', categories)
}

const getCategories = () => {
    return lightStorage.get('categories', {})
}

const getCategoryById = (id) => {
    return lightStorage.get(`categories.${id}`, {})
}

const removeCategory = (id) => {
    lightStorage.delete(`categories.${id}`)
}

const addOrEditCategoryById = (id, category) => {
    const key = id ?? crypto.randomUUID()
    lightStorage.set(`categories.${key}`, {...category, id: key})
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

const addPractical = (id, practical) => {
    lightStorage.set(`practicals.${id}`, { ...practical, id: id })
    return id
}

const getPracticals = () => {
    return lightStorage.get('practicals')
}

const getPracticalById = (practicalId) => {
    return lightStorage.get(`practicals.${practicalId}`, {})
}

const deletePracticalById = (id) => {
    lightStorage.delete(`practicals.${id}`)
}

const getIsDarkMode = () => {
    return lightStorage.get('isDarkMode', false)
}

const setIsDarkMode = (isDarkMode) => {
    lightStorage.set('isDarkMode', isDarkMode)
}

const search = (isChecklistFilterChecked, isBodyPartFilterChecked, isBodyTagFilterChecked, searchQuery) => {
    const checklists = lightStorage.get('checklists', {})
    const foundChecklists = {}
    const foundBodyParts = {}
    const foundBodyTags = {}

    for(const checklistId in checklists){
        const checklist = checklists[checklistId]
        const checklistName = checklist['name']

        if(isChecklistFilterChecked && checkSearchInput(checklistName, searchQuery)){
            foundChecklists[checklistId] = checklistName
        }

        const bodyParts = checklist['bodyParts']

        for(const bodyPartId in bodyParts){
            const bodyPart = bodyParts[bodyPartId]
            const bodyPartName = bodyPart['name']

            if(isBodyPartFilterChecked && checkSearchInput(bodyPartName, searchQuery)){
                const key = `${checklistId}_ ${bodyPartId}`
                foundBodyParts[key] = `${bodyPartName} - ${checklistName}`
            }

            const bodyTags = bodyPart['coordinates']

            for(const bodyTagId in bodyTags){
                const bodyTag = bodyTags[bodyTagId]
                const bodyTagName = bodyTag['name']

                if(isBodyTagFilterChecked && checkSearchInput(bodyTagName, searchQuery)){
                    const key = `${checklistId}_ ${bodyPartId}`
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
    deletePracticalById,
    getIsDarkMode,
    setIsDarkMode,
}
