const imgCanvas = document.querySelector("#img_canvas")
const kianImage = document.querySelector("#kianImage")
const checklistNav = document.querySelector("#checklists")


window.addEventListener('load', (e) => {
    const ctx = imgCanvas.getContext("2d");
    ctx.canvas.width = kianImage.width;
    ctx.canvas.height = kianImage.height;
    ctx.drawImage(kianImage, -1400, 0);
    createDropdowns()
})


const createDropdowns = () => {
    let checklists = window.api.getChecklists()
    for(let checklist of checklists){
        let checklistDropdown = createDropdown(checklist)
        checklistNav.append(checklistDropdown)
    }

}

// <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
//           <span class="navbar-toggler-icon"></span>
//         </button>


const createDropdown = (checklist) => {
    let list = document.createElement('li')
    list.classList.add('nav-item')
    list.classList.add('dropdown')
    let titleElement = createChecklistTitle(checklist)
    list.appendChild(titleElement)
    let bodyParts = Object.values(checklist)[0]
    let dropdownItems = createDropdownList(bodyParts)
    list.appendChild(dropdownItems)

    return list
}

const createChecklistTitle = (checklist) =>{
    let link = document.createElement('a')
    let checklistTitle = Object.keys(checklist)[0]
    link.classList.add('nav-link')
    link.classList.add('dropdown-toggle')
    link.setAttribute('data-bs-toggle', 'dropdown')
    link.innerHTML = checklistTitle
    return link
}

const createDropdownList = (bodyParts) => {
    let list = document.createElement('ul')
    list.classList.add('dropdown-menu')
    for(let bodyPart of bodyParts){
        let dropDownItem = createDropdownItem(bodyPart)
        list.appendChild(dropDownItem)
    }
    let divider = createDropdownDivider()
    let randomItem = createDropdownItemForRandom(bodyParts)
    list.appendChild(divider)
    list.appendChild(randomItem)
    return list
}

const createDropdownItem = (bodyPart) =>{
    let link = document.createElement('a')
    let title = Object.keys(bodyPart)[0]
    link.classList.add('dropdown-item')
    link.innerHTML = title

    let listItem = document.createElement('li')
    listItem.appendChild(link)
    listItem.addEventListener('click', () => {
        window.api.setCurrBodyPart(bodyPart)
        window.api.loadChecklistTest()
    })
    return listItem
    
}

const createDropdownDivider = () => {

    //<li><hr class="dropdown-divider"></li>
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
        let randomItem = bodyParts[Math.floor(Math.random()* bodyParts.length)]
        window.api.setCurrBodyPart(randomItem)
        window.api.loadChecklistTest()
    })
    return listItem
}
