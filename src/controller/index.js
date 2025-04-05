const myImage = document.querySelector('#bodyPart');
const bodyTagModalElement = document.querySelector("#body_tag_modal")
const bodyTagBtn = document.querySelector('#tag_btn')
const hintTagBtn = document.querySelector('#tag_hint')
const bodyTagTxt = document.querySelector("#body_tag")
const settingsModalElement = document.querySelector("#settings_modal")
const settingsBtn = document.querySelector('#settings_btn')
const hintSelect = document.querySelector("#hints")
const levelSelect = document.querySelector("#level")
const imgCanvas = document.querySelector("#img_canvas")
const dropArea = document.querySelector('#body_part_area');
const newBodyPartBtn = document.querySelector("#new_body_part")
const saveChecklistBtn = document.querySelector("#save_checklist")
const checklistTitleTxt = document.querySelector("#checklist_title")
const bodyTagPropmt = document.querySelector('#body_tag_prompt')
const wordbank = document.querySelector("#wordbank")
const nextBodyPartBtn = document.querySelector("#next_body_part")
const bodyTagModal = new bootstrap.Modal(bodyTagModalElement)
const settingsModal = new bootstrap.Modal(settingsModalElement)

let bodyPartCoordinates = {}
let correctTags = {}
let answerTag = {}
let hintTag = ''
let numHints = 0 
let bodyPartId = null
let bodyPartIdList = [] 
let checklistId = null
let usedIds = []
let scale = 1
let fontSize = 16


window.addEventListener('load', (e) => {
    bodyPartIdList = window.api.getCurrBodyPart()
    checklistId = window.api.getCurrChecklist()
    if(bodyPartIdList.length > 1){
        nextBodyPartBtn.classList.remove('hide')
    }
    window.api.clearCurrBodyPart()
    window.api.clearCurrChecklist()
    startBodyPartTest()
    
})

nextBodyPartBtn.addEventListener('click', () => {
    clearWordBank()
    startBodyPartTest()
})

hintTagBtn.addEventListener('click', () => {
    //answer tag is an obj with only an id and the value(answer)
    //so we just get the first value
    let answer = Object.values(answerTag)[0]
    hintTag = answer.substring(0, hintTag.length+1)
    numHints--
    enableDisableHints()
    alert(`Word Starts With : ${hintTag}`)
})

settingsBtn.addEventListener('click', () => {
    let useWordbank = levelSelect.value < 3
    let useHints = levelSelect.value < 4
    if(useWordbank){
        setupWordBank()
    } else{
        wordbank.classList.add('empty-wordbank')
    }

    if(useHints){
        numHints = hintSelect.value
    }
    enableDisableHints() 

    settingsModal.hide()
})

levelSelect.addEventListener('change', () => {
    let level = levelSelect.value
    if(level == 4){
        hintSelect.disabled = true
    } else{
        hintSelect.disabled = false
    }
})

imgCanvas.addEventListener('click', (event) => {
    let coordinates = getClickCoordinates(event, scale)
    let x = coordinates['x']
    let y = coordinates['y']
    let key = checkCoordinatesExist(imgCanvas, x, y, bodyPartCoordinates, scale, false)

    if(key){
        setupTagQuestion(key)
    }
})

bodyTagBtn.addEventListener('click', () => {
    let txt = bodyTagTxt.value

    if(txt){
        let id = Object.keys(answerTag)[0]
        let answer = answerTag[id]
        if(txt.toLowerCase().trim() == answer.toLowerCase().trim()){
            bodyTagModal.hide()
            correctTags[id] = answer
            updateBodyPartTest()
            hintTag = ''
            alert("Correct!!")
        }else{
            alert("Wrong!!")
        }
    }
    else{
        alert("You gotta type somethign big dog")
    }
})

const startBodyPartTest = () => {
    setBodyPartIdFromList()
    if(usedIds.length == bodyPartIdList.length){
        nextBodyPartBtn.classList.add('hide')
    }
    drawBodyPartTest()
    configureSettings()
}

const clearWordBank = () => {
    wordbank.innerHTML = ''
}

const addToWordBank = (id, word) => {
    let span = document.createElement('span')
    span.innerHTML = word
    span.classList.add('wordbank-word')
    span.classList.add(id)
    wordbank.appendChild(span)
}

const setupWordBank = async () => {
    let bodyPart = await window.api.getBodyPartById(bodyPartId, checklistId)
    coordinatesMap = bodyPart['coordinates']
    for(let key in coordinatesMap){
        let coordinates = coordinatesMap[key]
        let tagName = coordinates['name']
        addToWordBank(key, tagName)
    }

}

const updateWordBank = () => {
    for(let child of wordbank.children){
        //let txt = child.innerHTML
        let keys = Object.keys(correctTags)
        
        let isUsed = keys.some(item => child.classList.contains(item))
        let isMarked = child.classList.contains('wordbank-used')
        if(isUsed && !isMarked){
            child.classList.add('wordbank-used')
        }
    }
}

const enableDisableHints = () => {
    if(numHints > 0) {
        hintTagBtn.disabled = false
    }
    else{
        hintTagBtn.disabled = true
    }
}

const configureSettings = () => {
    settingsModal.show()
}

const updateBodyPartTest = () => {
    clearCanvas(imgCanvas)
    drawBodyPartTest()
    updateWordBank()
}

const drawBodyPartTest = async () =>{
    let bodyPart = await window.api.getBodyPartById(bodyPartId, checklistId)
    let title = bodyPart['name']
    scale = bodyPart['scale'] || 1
    fontSize = bodyPart['fontSize'] || 16
    checklistTitleTxt.value = title
    let image = bodyPart['img']
    myImage.src = image
    await drawNewImage(imgCanvas, myImage, 0, 0, scale)
    bodyPartCoordinates = bodyPart['coordinates']
    await drawBodyPartTags(bodyPartCoordinates)
    
}


const drawBodyPartTags = async (coordinatesMap) => {
    for(let key in coordinatesMap){
        let coordinates = coordinatesMap[key]
        let tagName = coordinates['name']
        let possibleAnswer = correctTags[key]
        let isAnswered = possibleAnswer == tagName
        if(!isAnswered){
            drawNewQuestionMark(imgCanvas, coordinates, scale)
        }
        else{
            drawNewText(imgCanvas, tagName, coordinates, fontSize)
        }
        
    }
}

const setBodyPartIdFromList = () => {
    
    do{
        bodyPartId = bodyPartIdList[Math.floor(Math.random()* bodyPartIdList.length)]
    }
    while(usedIds.includes(bodyPartId))
    usedIds.push(bodyPartId)
}

const setupTagQuestion = async (key) => {
    let coordinates = bodyPartCoordinates[key]
    let tagName = coordinates['name']
    let categoryId = coordinates['category']
    let prompt = 'Enter Tag'
    if(categoryId && categoryId != 'null'){
        let category = await window.api.getCategoryById(categoryId)
        prompt = `What is this ${category}?`
    }
    if(answerTag){
        answerTag = {}
    }
    answerTag[key] = tagName
    bodyTagPropmt.innerHTML = prompt
    bodyTagTxt.value = ''
    bodyTagModal.show()
}

