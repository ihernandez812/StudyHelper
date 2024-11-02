const imgCanvas = document.querySelector("#img_canvas")
const kianImage = document.querySelector("#kianImage")
const checklistNav = document.querySelector("#checklists")
const addChecklistBtn = document.querySelector("#add_checklist")
const checklistModalElement = document.querySelector("#checklist_modal")
const checklistBtn = document.querySelector('#checklist_btn')
const checklistTxt = document.querySelector("#checklist_title")
const checklistModal = new bootstrap.Modal(checklistModalElement)
let editClicked = false
let deleteClicked = false
//fa icons
//<i class="fa-regular fa-trash"></i>
//<i class="fa-solid fa-plus"></i>
//<i class="fa-regular fa-pen-to-square"></i>


window.addEventListener('load', async (e) => {
    await window.api.addIdsToChecklists()
    await window.api.addIdsToTags()
    window.api.saveChecklistCopy()
    const ctx = imgCanvas.getContext("2d");
    ctx.canvas.width = kianImage.width;
    ctx.canvas.height = kianImage.height;
    ctx.drawImage(kianImage, -1400, 0);
    createDropdowns()
})

addChecklistBtn.addEventListener('click', () => {
    checklistModal.show()
})

checklistBtn.addEventListener('click', async () => {
    let checklistTitle = checklistTxt.value
    if(checklistTitle){
        let id = await window.api.generateId()
        let checklist = {
            name: checklistTitle,
            bodyParts: {}
        }
        window.api.addChecklist(id, checklist)
        let checklistDropdown = createDropdown(checklist, id)
        checklistNav.appendChild(checklistDropdown)
        checklistModal.hide()
    }
    else{
        alert('You Gotta Type Something Big Dog')
    }
})


const createDropdowns = () => {
    let checklists = window.api.getChecklists() 
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

    return list
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
    link.innerHTML = title

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

    link.appendChild(span)


    let listItem = document.createElement('li')
    listItem.appendChild(link)
    //listItem.appendChild(span)
    link.addEventListener('click', () => {
        window.api.setCurrBodyPart(bodyPart)
        window.api.loadChecklistTest()
    })

    editIcon.addEventListener('click', (event) => {
        event.stopImmediatePropagation()
        window.api.setEditBodyPart(key)
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

    let listItem = document.createElement('li')
    listItem.appendChild(link)
    //Used so we can delete the random list item if they
    //delete the last body part won't happen often but 
    //irked me during testing 
    listItem.setAttribute('id', `random_${checklistKey}`)
    listItem.addEventListener('click', () => {
        let checklist = window.api.getChecklistById(checklistKey)
        let bodyParts = checklist['bodyParts']
        let bodyPartList = Object.values(bodyParts)
        let randomItem = bodyPartList[Math.floor(Math.random()* bodyPartList.length)]
        window.api.setCurrBodyPart(randomItem)
        window.api.loadChecklistTest()
    })
    
    return listItem
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
