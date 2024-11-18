const practicalAccordion = document.querySelector("#practical_accoridan")
const canvasesContainer = document.querySelector(".canvases")
const backBtn = document.querySelector('#back')
const bodyTagResponseTxt = document.querySelector("#body_tag_response")
const bodyTagAnswerTxt = document.querySelector("#body_tag_answer")
const bodyTagModalElement = document.querySelector("#body_tag_modal")
const bodyTagModal = new bootstrap.Modal(bodyTagModalElement)
let stationBodyPartToTags = {}
let bodyPartToImageSettings = {}

window.onload = async () => {
    let practicals = await window.api.getPracticals()
    for(let id in practicals){
        let practical = practicals[id]
        if(isObjectNotArray(practical)){
            
            let accordionItem = createPracticalAccordion(id, practical)
            practicalAccordion.appendChild(accordionItem)
        }
        else{
            delete practicals[id]
        }
    }
}

backBtn.addEventListener('click', () => {
    practicalAccordion.classList.remove('hide')
    canvasesContainer.innerHTML = ''
    backBtn.classList.add('hide')
})

function isObjectNotArray(obj) {
    return typeof obj === 'object' && !Array.isArray(obj);
}
const createPracticalAccordion = (practicalId, practical) => {
    let accordionItem = document.createElement('div')
    accordionItem.classList.add('accordion-item')
    let stationGrades = calculateStationGrades(practical)
    let header = createaccordionHeader(practicalId, practical, stationGrades)
    let body = createaccordionBody(practicalId, practical, stationGrades)
    accordionItem.append(header, body)
    return accordionItem

}

const createaccordionBody = (practicalId, practical, stationGrades) => {
    let accordionCollapse = document.createElement('div')
    accordionCollapse.setAttribute('id', `${practicalId}_collapse`)
    accordionCollapse.setAttribute('data-bs-parent', '#practical_accordion')
    accordionCollapse.classList.add('accordion-collapse')
    accordionCollapse.classList.add('collapse')
    //accordionCollapse.classList.add('show')

    let accordionBody = document.createElement('div')
    accordionBody.classList.add('accordion-body')

    let accordionStations = createaccordionStations(practical, stationGrades)

    accordionBody.appendChild(accordionStations)
    accordionCollapse.appendChild(accordionBody)
    return accordionCollapse
}

const createaccordionStations = (practical, stationGrades) => {
    let listGroup = document.createElement('ul')
    let stations = practical['stations']
    listGroup.classList.add('list-group')
    for(let i=0; i<stations.length; i++){
        let stationGrade = stationGrades[i]
        let listItem = createListItem(i, stationGrade)
        listGroup.appendChild(listItem)
        listItem.addEventListener('click', () => {
            switchToStationsView()
            displayStation(stations[i])
        })
    }
    return listGroup
}

const calculateStationGrades = (practical) => {
    let stationGrades = []
    let stations = practical['stations']
    for(let station of stations){
        let stationGrade = calculateStationGrade(station)
        stationGrades.push(stationGrade)
    }
    return stationGrades
}

const calculateStationGrade = (station) => {
    let correct = 0
    for(let bodyTag of station){
        let res = getIsBodyTagCorrect(bodyTag)
        if(res){
            correct++
        }
    }

    return `${correct}/${station.length}`
}

const createListItem = (i, stationGrade) => {
    let listItem = document.createElement('li')
    listItem.classList.add('list-group-item')
    let textSpan = document.createElement('span')
    let gradeSpan = document.createElement('span')
    gradeSpan.classList.add('grade')
    textSpan.innerHTML = `Station ${i+1}`
    gradeSpan.innerHTML =  stationGrade
    listItem.append(textSpan, gradeSpan)
    return listItem
}

const createaccordionHeader = (practicalId, practical, stationGrades) => {
    let header = document.createElement('h2')
    header.classList.add('accordion-header')
    header.setAttribute('id', `${practicalId}_header`)
    let btn = document.createElement('button')
    btn.classList.add('accordion-button')
    btn.classList.add('collapsed')
    btn.setAttribute('type', 'button')
    btn.setAttribute('data-bs-toggle', 'collapse')
    btn.setAttribute('data-bs-target', `#${practicalId}_collapse`)
    let link = document.createElement('span')
    link.classList.add('practical-name')
    link.innerHTML = `${practical['name']} (${practical['date']})`

    let practicalGrade = calculatePracticalGrade(stationGrades)
    let gradeSpan = document.createElement('span')
    gradeSpan.classList.add('grade-header')
    gradeSpan.innerHTML = practicalGrade
    btn.append(link)
    header.appendChild(btn)
    link.addEventListener('click', (event) => {
        event.stopImmediatePropagation()
        event.preventDefault()
        switchToStationsView()
        displayStations(practical['stations'])
    })
    return header
}

const calculatePracticalGrade = (stationGrades) => {
    let total = 0
    let correct = 0
    for(let stationGrade of stationGrades){
        let stationGradeSplit = stationGrade.split('/')
        correct += Number(stationGradeSplit[0]) 
        total += Number(stationGradeSplit[1]) 
    }
    return `${correct}/${total}`
}

const addStationEventListeners = () => {
    for(let id in stationBodyPartToTags){
        let bodyTags = stationBodyPartToTags[id]
        let canvas = document.querySelector(`#${id}`)
        let imageSettings = bodyPartToImageSettings[id]

        canvas.addEventListener('click', (event) => {
            let scale = imageSettings['scale']     
            let coordinates = getClickCoordinates(event, scale) 
            let x = coordinates['x']
            let y = coordinates['y'] 
            let key = null
            
            key = checkCoordinatesExistList(canvas, x, y, bodyTags, scale, true, true)  
            if(key != null){
                clickedStationId = id
                bodyTagPos = key
                setupTagModal(bodyTags[key])
            }
        })
    }
}


const setupTagModal = (bodyTag) => {
    let response = bodyTag['answer'] || 'No Answer'
    let answer = bodyTag['name']
    bodyTagResponseTxt.value = response
    bodyTagAnswerTxt.value = answer
    bodyTagModal.show()
}

const displayStations = async (stations) => {
    for(let station of stations){
        await displayStation(station, false)
    }
    addStationEventListeners()
}

const displayStation = async (station, shouldAddEventListeners=true) => {
    for(let bodyTag of station){
        let bodyPartId = bodyTag['bodyPart']
        let bodyPartCanvas = document.getElementById(`${bodyPartId}`)
        let scale = 1
        let font = 16
        let answer = bodyTag['answer'] || 'No Answer'
        if(!bodyPartCanvas){
            let bodyPartRow = createBodyPartCanvas(bodyPartId)
            canvasesContainer.appendChild(bodyPartRow)
            bodyPartCanvas = bodyPartRow.querySelector('canvas')
            let checklistId = bodyTag['checklist']
            let bodyPart = await window.api.getBodyPartById(bodyPartId, checklistId)
            let img = bodyPartCanvas.querySelector('img')
            img.src = bodyPart['img']
            scale = bodyPart['scale'] || 1
            font = bodyPart['fontSize'] || 16
            await drawNewImage(bodyPartCanvas, img, 0, 0, scale)
            bodyPartToImageSettings[bodyPartId] = {
                scale: scale,
                font: font 
            }
        }
        let fillColor = getFillColorForCoordinates(bodyTag)
        await drawNewText(bodyPartCanvas, answer, bodyTag, font, fillColor)
        let bodyTagList = stationBodyPartToTags[bodyPartId] || []
        bodyTagList.push(bodyTag)
        stationBodyPartToTags[bodyPartId] = bodyTagList
    }
    if(shouldAddEventListeners){
        addStationEventListeners()
    }
}

const getFillColorForCoordinates = (bodyTag) => {
    let isCorrect = getIsBodyTagCorrect(bodyTag)
    let fillStyle = ''
    if(isCorrect){
        fillStyle = '#8dd68d'
    }
    else{
        fillStyle = '#d68f8d'
    }

    return fillStyle

}

const getIsBodyTagCorrect = (bodyTag) => {
    let enteredAnswer = bodyTag['answer'] || ''
    let answer = bodyTag['name']
    return enteredAnswer.toLowerCase() == answer.toLowerCase()
}

const createBodyPartCanvas = (id) =>{
    let row = document.createElement("div")
    row.classList.add('row')
    row.classList.add('canvas-row')
    row.style.width = '100%'
    let col = document.createElement('div')
    col.classList.add('col-6')
    col.classList.add('body_part_area')
    let canvas = document.createElement('canvas')
    canvas.classList.add('config-img')
    canvas.setAttribute('id', id)
    let img = document.createElement('img')
    img.classList.add('img-fluid')
    canvas.appendChild(img)
    col.appendChild(canvas)
    row.appendChild(col)
    return row
}

const switchToStationsView = () => {
    backBtn.classList.remove('hide')
    practicalAccordion.classList.add('hide')
    stationBodyPartToTags = {}
}