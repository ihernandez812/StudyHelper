const imgCanvas = document.querySelector("#img_canvas")
const kianImage = document.querySelector("#kianImage")
const checklistNav = document.querySelector("#checklists")
const addChecklistBtn = document.querySelector("#add_checklist")
const checklistModalElement = document.querySelector("#checklist_modal")
const checklistBtn = document.querySelector('#checklist_btn')
const checklistTxt = document.querySelector("#checklist_title")
const filterModalElement = document.querySelector('#filter_modal')
const filterBtn = document.querySelector('#filter_btn')
const searchDropdown = document.querySelector('#search_dropdown')
const searchInput = document.querySelector('#search_input')
const saveFilterBtn = document.querySelector("#save_filter_btn")
const checklistFilter = document.querySelector('#checklist_filter')
const bodyPartFilter = document.querySelector('#body_part_filter')
const bodyTagFilter = document.querySelector('#body_tag_filter')
const filterModal = new bootstrap.Modal(filterModalElement)
const checklistModal = new bootstrap.Modal(checklistModalElement)
let editChecklistId = null
let editChecklistTitleElement = null
//fa icons
//<i class="fa-regular fa-trash"></i>
//<i class="fa-solid fa-plus"></i>
//<i class="fa-regular fa-pen-to-square"></i>


window.addEventListener('load', async (e) => {
    await window.api.addIdsToChecklists()
    await window.api.addIdsToTags()
    await window.api.addChecklistAndCategoriesToDB()
    const ctx = imgCanvas.getContext("2d");
    ctx.canvas.width = kianImage.width;
    ctx.canvas.height = kianImage.height;
    ctx.drawImage(kianImage, -1400, 0);
    createDropdowns()
})

searchInput.addEventListener('focus', () => {
    searchDropdown.classList.add('show')
})

searchInput.addEventListener('blur', async() => {
    await new Promise(r => setTimeout(r, 200));
    searchDropdown.classList.remove('show')
})

searchInput.addEventListener('search', (event) => {
    event.preventDefault()
    event.stopImmediatePropagation()
    search()
})

//There will be no submitting lol
document.addEventListener('submit', (event) => {
    event.preventDefault()
    event.stopImmediatePropagation()
    search()
}, false)

searchInput.addEventListener('keyup', () => {
    search()
})

const search = async () => {
    let isChecklistFilterChecked = checklistFilter.checked
    let isBodyPartFilterChecked = bodyPartFilter.checked
    let isBodyTagFilterChecked = bodyTagFilter.checked
    let searchValue = searchInput.value
    let searchResults = await window.api.search(isChecklistFilterChecked, isBodyPartFilterChecked, isBodyTagFilterChecked, searchValue)
    let checklists = searchResults['checklists']
    let bodyParts = searchResults['bodyParts']
    let bodyTags = searchResults['bodyTags']
    searchDropdown.innerHTML = ''
    for(let key in checklists){
        let checklist = checklists[key]
        let listItem = createSearchDropdownItem(key, checklist, false)
        if(listItem){
            searchDropdown.appendChild(listItem)
        }
    }
    for(let key in bodyParts){
        let bodyPart = bodyParts[key]
        let listItem = createSearchDropdownItem(key, bodyPart)
        if(listItem){
            searchDropdown.appendChild(listItem)
        }
    }
    for(let key in bodyTags){
        let bodyTag = bodyTags[key]
        let listItem = createSearchDropdownItem(key, bodyTag)
        if(listItem){
            searchDropdown.appendChild(listItem)
        }
    }
}


const createSearchDropdownItem = (key, txt, canEdit=true) => {
    let link = document.createElement('a')
    link.classList.add('dropdown-item')

    let linkSpan = document.createElement('span')
    linkSpan.classList.add('dropdown-title')
    linkSpan.innerHTML = txt
    
    let span = document.createElement('span')
    span.classList.add('fa-icons')

    let editIcon = document.createElement('i')
    editIcon.classList.add('fa')
    editIcon.classList.add('fa-pencil-square-o')
    if(canEdit){
        span.appendChild(editIcon)
    }
    link.appendChild(linkSpan)
    link.appendChild(span)


    let listItem = document.createElement('li')
    listItem.appendChild(link)
    listItem.setAttribute('data-bs-toggle', 'tooltip')
    listItem.setAttribute('data-bs-placement', 'top')
    listItem.setAttribute('title', txt)
    //listItem.appendChild(span)
    
    let idList = key.split('_')
    let checklistId = idList[0]
    let bodyPartId = ''
    //If the search is on a checklist then there will only be one id
    //if it is on a body part or body tag it will have 2 ids
    if(idList.length > 1){
        bodyPartId = idList[1]
    }

    //we only want these event listeners is a body part
    //or body tag. 
    if(checklistId && bodyPartId) {
        listItem.addEventListener('click', () => {
            window.api.setCurrChecklist(checklistId)
            window.api.setCurrBodyPart(bodyPartId)
            window.api.loadChecklistTest()
        })
        editIcon.addEventListener('click', (event) => {
            event.stopImmediatePropagation()
            window.api.setCurrBodyPart(bodyPartId)
            window.api.setCurrChecklist(checklistId)
            window.api.loadConfigBodyPart()
        })
    }
    
    return listItem
}

saveFilterBtn.addEventListener('click', () => {
    //reload search 
    search()
    filterModal.hide()
})

filterBtn.addEventListener('click', () => {
    filterModal.show()
})

addChecklistBtn.addEventListener('click', () => {
    checklistModal.show()
})

checklistBtn.addEventListener('click', async () => {
    let checklistTitle = checklistTxt.value
    if(checklistTitle){
        if(editChecklistId && editChecklistTitleElement){
            editChecklist(editChecklistId, editChecklistTitleElement, checklistTitle)
        }
        else{
            addChecklist(checklistTitle)
        }
        
        checklistModal.hide()
    }
    else{
        alert('You Gotta Type Something Big Dog')
    }
})

const editChecklist = async (editChecklistId, editChecklistTitleElement, checklistTitle) => {
    let checklist = await window.api.getChecklistById(editChecklistId)

    checklist['name'] = checklistTitle
    window.api.addOrEditChecklistById(editChecklistId, checklist)
    editChecklistTitleElement.innerHTML = checklistTitle
    editChecklistTitleElement = null
    editChecklistId = null
}

const addChecklist = async () => {
    let id = await window.api.generateId()
    let checklist = {
        name: checklistTitle,
        bodyParts: {}
    }
    window.api.addOrEditChecklistById(id, checklist)
    let checklistDropdown = createDropdown(checklist, id)
    checklistNav.appendChild(checklistDropdown)
}

const createDropdowns = async () => {
    let checklists = await window.api.getChecklists() 
    for(let key in checklists){
        let checklist = checklists[key]
        let checklistDropdown = createDropdown(checklist, key)
        checklistNav.append(checklistDropdown)
    }

}


const createDropdown = (checklist, key) => {
    let list = document.createElement('li')
    list.classList.add('nav-item')
    list.classList.add('dropdown')
    let titleElement = createChecklistTitle(checklist)
    list.appendChild(titleElement)
    let bodyParts = checklist['bodyParts']
    let dropdownItems = createDropdownList(bodyParts, key)
    list.appendChild(dropdownItems)
    list.addEventListener('contextmenu', () => {
        setupEditChecklist(titleElement, key)
    })
    return list
}

const setupEditChecklist = (titleElement, checklistId) => {
    editChecklistTitleElement = titleElement
    editChecklistId = checklistId
    checklistModal.show()
}

const createChecklistTitle = (checklist) =>{
    let link = document.createElement('a')
    let checklistTitle = checklist['name']
    link.classList.add('nav-link')
    link.classList.add('dropdown-toggle')
    link.setAttribute('data-bs-toggle', 'dropdown')
    link.innerHTML = checklistTitle
    return link
}

const createDropdownList = (bodyParts, checklistKey) => {
    let list = document.createElement('ul')
    list.classList.add('dropdown-menu')
    for(let key in bodyParts){
        let bodyPart = bodyParts[key]
        let dropDownItem = createDropdownItem(bodyPart, key, checklistKey)
        list.appendChild(dropDownItem)
    }
    let divider = createDropdownDivider()
    let otherDivider = createDropdownDivider()
    let randomItem = createDropdownItemForRandom(checklistKey)
    let addBodyPartItem = createDropdownItemForAddBodyPart(checklistKey)
    if(Object.keys(bodyParts).length > 0){
        list.appendChild(divider)
        list.appendChild(randomItem)
    }
    list.appendChild(otherDivider)
    list.appendChild(addBodyPartItem)
    return list
}

//<span class="fa-icons"><i class="fa fa-pencil-square-o"></i> <i class="fa fa-trash-o" aria-hidden="true"></i> </span>

const createDropdownItem = (bodyPart, key, checklistKey) =>{
    let link = document.createElement('a')
    let title = bodyPart['name']
    link.classList.add('dropdown-item')
    //data-bs-toggle="tooltip" data-bs-placement="top" title="Tooltip on top">
    

    let linkSpan = document.createElement('span')
    linkSpan.classList.add('dropdown-title')
    linkSpan.innerHTML = title
    

    let span = document.createElement('span')
    span.classList.add('fa-icons')

    let editIcon = document.createElement('i')
    editIcon.classList.add('fa')
    editIcon.classList.add('fa-pencil-square-o')

    let deleteIcon = document.createElement('i')
    deleteIcon.classList.add('fa')
    deleteIcon.classList.add('fa-trash-o')

    span.appendChild(editIcon)
    span.appendChild(deleteIcon)
    link.appendChild(linkSpan)
    link.appendChild(span)


    let listItem = document.createElement('li')
    listItem.appendChild(link)
    listItem.setAttribute('data-bs-toggle', 'tooltip')
    listItem.setAttribute('data-bs-placement', 'top')
    listItem.setAttribute('title', title)
    //listItem.appendChild(span)
    link.addEventListener('click', () => {
        window.api.setCurrChecklist(checklistKey)
        window.api.setCurrBodyPart([key])
        window.api.loadChecklistTest()
    })

    editIcon.addEventListener('click', (event) => {
        event.stopImmediatePropagation()
        window.api.setCurrBodyPart(key)
        window.api.setCurrChecklist(checklistKey)
        window.api.loadConfigBodyPart()
    })
    
    deleteIcon.addEventListener('click', (event) => {
        event.stopImmediatePropagation()
        window.api.dialogQuestion('Are you sure you want to delete?')
        .then(res => {
            let result = res.response
            if(result == 0){
                let dropdownList = listItem.parentElement
                listItem.remove()
                window.api.removeBodyPart(key, checklistKey)
                //we know there are only the random and add body part list items
                //if there are only 4 children
                if(dropdownList.children.length == 4){
                    let randomDropdown = document.querySelector(`#random_${checklistKey}`)
                    randomDropdown.remove()
                    dropdownList.children[0].remove()
                }
            }
        })
    })
    return listItem
    
}

const createDropdownDivider = () => {

    let list = document.createElement('li')
    let line = document.createElement('hr')
    line.classList.add('dropdown-divider')
    list.appendChild(line)
    return list
}

const createDropdownItemForRandom = (checklistKey) => {
    let link = document.createElement('a')
    link.classList.add('dropdown-item')
    link.innerHTML = 'Random'

    let arrowIcon = document.createElement('i')
    arrowIcon.classList.add('fa')
    arrowIcon.classList.add('fa-caret-right')
    link.appendChild(arrowIcon)

    let listItem = document.createElement('li')
    listItem.appendChild(link)
    //Used so we can delete the random list item if they
    //delete the last body part won't happen often but 
    //irked me during testing 
    let randomSubmenu = document.createElement('ul')
    randomSubmenu.classList.add('submenu')
    randomSubmenu.classList.add('dropdown-menu')

    let singleRandom = document.createElement('li')
    let singleRandomLink = document.createElement('a')
    singleRandomLink.classList.add('dropdown-item')
    singleRandomLink.innerHTML = 'Single Body Part'

    let continuousRandom = document.createElement('li')
    let continuousRandomLink = document.createElement('a')
    continuousRandomLink.classList.add('dropdown-item')
    continuousRandomLink.innerHTML = 'All Body Parts'

    singleRandom.appendChild(singleRandomLink)
    continuousRandom.appendChild(continuousRandomLink)
    randomSubmenu.append(singleRandom, continuousRandom)
    listItem.appendChild(randomSubmenu)

    
    listItem.setAttribute('id', `random_${checklistKey}`)
    singleRandom.addEventListener('click', async (event) => {
        event.stopImmediatePropagation()
        event.preventDefault()
        let bodyPartList = await getBodyPartKeys(checklistKey)
        let randomItem = bodyPartList[Math.floor(Math.random()* bodyPartList.length)]
        window.api.setCurrChecklist(checklistKey)
        window.api.setCurrBodyPart([randomItem])
        window.api.loadChecklistTest()
    })

    continuousRandom.addEventListener('click', async (event) => {
        event.stopImmediatePropagation()
        event.preventDefault()
        let bodyPartList = await getBodyPartKeys(checklistKey)
        window.api.setCurrChecklist(checklistKey)
        window.api.setCurrBodyPart(bodyPartList)
        window.api.loadChecklistTest()
    })
    
    return listItem
}

const getBodyPartKeys = async (checklistKey) => {
    let checklist = await window.api.getChecklistById(checklistKey)
    let bodyParts = checklist['bodyParts']
    let bodyPartList = Object.keys(bodyParts)
    return bodyPartList
}

const createDropdownItemForAddBodyPart = (checklistKey) => {
    let link = document.createElement('a')
    link.classList.add('dropdown-item')
    link.innerHTML = 'Add Body Part'

    let listItem = document.createElement('li')
    listItem.appendChild(link)
    listItem.addEventListener('click', () => {
        window.api.setCurrChecklist(checklistKey)
        window.api.loadConfigBodyPart()
    })
    
    return listItem
}
