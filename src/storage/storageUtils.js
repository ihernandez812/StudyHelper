const Storage = require('electron-light-storage')
const localStorage = new Storage()


const sanatizeId = (id) => {
    //Converting from actual localStorage to 
    //this doesn't work all that well
    //sub object keys are strings with "
    //so we have to remove them
    while(id.includes('"') || id.includes(' ')){
        id = id.replace('"', '')
        id = id.replace(' ', '')
    }
    return id
}

//Need to store checklist and categories in here
//During upgrade tasks we need to set the checklist to here
const setChecklists = (checklists) => {
    localStorage.set({
        checklists: checklists
    })
}

const addOrEditChecklistById =  (id, checklist) => {
    let checklists = localStorage.get('checklists')|| {}
    checklists[id] = checklist
    localStorage.set({
        checklists: checklists
    })
}

const getChecklists = () => {
    return localStorage.get('checklists') || {}
}

const getChecklistById = (key) => {
    let checklists = localStorage.get('checklists') || {}
    let id = sanatizeId(key)
    return checklists[id]
}

const getBodyPartById = (bodyPartId, checklistId) => {
    let checklists = localStorage.get('checklists') || {}
    checklistId = sanatizeId(checklistId)
    let checklist = checklists[checklistId]
    let bodyParts = checklist['bodyParts']
    bodyPartId = sanatizeId(bodyPartId)
    return bodyParts[bodyPartId]
}

const addOrEditBodyPartById = (bodyPartId, checklistId, bodyPart) => {
    let checklists = localStorage.get('checklists') || {}
    checklistId = sanatizeId(checklistId)
    let checklist = checklists[checklistId]
    let bodyParts = checklist['bodyParts']
    bodyPartId = sanatizeId(bodyPartId)
    bodyParts[bodyPartId] = bodyPart
    localStorage.set({
        checklists: checklists
    })
}

const removeBodyPart = (key, checklistKey) => {
    let checklists = localStorage.get('checklists')
    checklistKey = sanatizeId(checklistKey)
    let checklist = checklists[checklistKey]
    let bodyParts = checklist['bodyParts']
    delete bodyParts[key]

    localStorage.set({
        checklists: checklists
    })
}

//During upgrade tasks we need to set the categoriesto here
const setCategories = (categories) => {
    localStorage.set({
        categories: categories
    })
}
const getCategories = () => {
    return localStorage.get('categories') || {}

}

const getCategoryById = (id) => {
    let categories = localStorage.get('categories') || {}
    id = sanatizeId(id)
    return categories[id]
}

const removeCategory = (id) => {
    let categories = localStorage.get('categories') || {}
    id = sanatizeId(id)
    delete categories[id]
    localStorage.set({
        categories: categories
    })
}

const addOrEditCategoryById = (id, category) => {
    let categories = localStorage.get('categories') || {}
    id = sanatizeId(id)
    categories[id] = category
    localStorage.set({
        categories: categories
    })
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
        } 
        else{
            if(possibleValue.startsWith(query)){
                result = true
            }
        }
    }
    return result
}

const addPractical = (practicalId, practical) => {
    let practicals = localStorage.get('practicals')|| {}
    practicals[practicalId] = practical 
    localStorage.set({
        practicals: practicals
    })
}

const getPracticals = () => {
    return localStorage.get('practicals')
}

const getPracticalById = (practicalId) => {
    let practicals = localStorage.get('practicals')|| {}
    return practicals[practicalId]
}

const search = (isChecklistFilterChecked, isBodyPartFilterChecked, isBodyTagFilterChecked, searchQuery) => {
    let checklists = localStorage.get('checklists') || {}
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
    getPracticalById
}
