const imgCanvas = document.querySelector("#img_canvas")
const kianImage = document.querySelector("#kianImage")
const checklistNav = document.querySelector("#checklists")


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


const createDropdowns = () => {
    let checklists = window.api.getChecklists() 
    for(let key in checklists){
        let checklist = checklists[key]
        let checklistDropdown = createDropdown(checklist)
        checklistNav.append(checklistDropdown)
    }

}


const createDropdown = (checklist) => {
    let list = document.createElement('li')
    list.classList.add('nav-item')
    list.classList.add('dropdown')
    let titleElement = createChecklistTitle(checklist)
    list.appendChild(titleElement)
    let bodyParts = checklist['bodyParts']
    let dropdownItems = createDropdownList(bodyParts)
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

const createDropdownList = (bodyParts) => {
    let list = document.createElement('ul')
    list.classList.add('dropdown-menu')
    for(let key in bodyParts){
        let bodyPart = bodyParts[key]
        let dropDownItem = createDropdownItem(bodyPart, key)
        list.appendChild(dropDownItem)
    }
    let divider = createDropdownDivider()
    let randomItem = createDropdownItemForRandom(bodyParts)
    list.appendChild(divider)
    list.appendChild(randomItem)
    return list
}

const createDropdownItem = (bodyPart, key) =>{
    let link = document.createElement('a')
    let title = bodyPart['name']
    link.classList.add('dropdown-item')
    link.innerHTML = title

    let listItem = document.createElement('li')
    listItem.appendChild(link)
    listItem.addEventListener('click', () => {
        window.api.setCurrBodyPart(bodyPart)
        window.api.loadChecklistTest()
    })

    listItem.addEventListener('contextmenu', () => {
        window.api.setEditBodyPart([bodyPart, key])
        window.api.loadEditChecklist()
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

const createDropdownItemForRandom = (bodyParts) => {
    let link = document.createElement('a')
    link.classList.add('dropdown-item')
    link.innerHTML = 'Random'

    let listItem = document.createElement('li')
    listItem.appendChild(link)
    listItem.addEventListener('click', () => {
        console.log(bodyParts)
        let bodyPartList = Object.values(bodyParts)
        let randomItem = bodyPartList[Math.floor(Math.random()* bodyPartList.length)]
        window.api.setCurrBodyPart(randomItem)
        window.api.loadChecklistTest()
    })
    
    return listItem
}
