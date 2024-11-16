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
let question_mark_path = '../images/question-mark.png'
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

//by #
//by class . document.querySelectorAll('.className')
//by class . document.querySelector('.className')

window.addEventListener('load', (e) => {
    bodyPartIdList = window.api.getCurrBodyPart()
    checklistId = window.api.getCurrChecklist()
    if(bodyPartIdList.length > 1){
        nextBodyPartBtn.classList.remove('hide')
    }
    startBodyPartTest()
})

nextBodyPartBtn.addEventListener('click', () => {
    clearWordBank()
    startBodyPartTest()
})

const startBodyPartTest = () => {
    setBodyPartIdFromList()
    if(usedIds.length == bodyPartIdList.length){
        nextBodyPartBtn.classList.add('hide')
    }
    setupbodyPartTest()
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

const updateBodyPartTest = () => {
    const ctx = imgCanvas.getContext("2d");
    ctx.clearRect(0, 0, imgCanvas.width, imgCanvas.height);
    setupbodyPartTest()
    updateWordBank()
}

const setupbodyPartTest = async () =>{
    window.api.clearCurrBodyPart()
    window.api.clearCurrChecklist()
    let bodyPart = await window.api.getBodyPartById(bodyPartId, checklistId)
    let title = bodyPart['name']
    scale = bodyPart['scale'] || 1
    fontSize = bodyPart['fontSize'] || 16
    checklistTitleTxt.value = title
    let image = bodyPart['img']
    myImage.src = image
    await setBaseImage(myImage, 0, 0)
    bodyPartCoordinates = bodyPart['coordinates']
    await drawQuestionMarks(bodyPartCoordinates)
    
}

const scaleImage = () => {
    let ctx = imgCanvas.getContext('2d')
    ctx.scale(scale, scale)
}

const drawQuestionMarks = async (coordinatesMap) => {
    for(let key in coordinatesMap){
        let coordinates = coordinatesMap[key]
        let tagName = coordinates['name']
        let possibleAnswer = correctTags[key]
        let isAnswered = possibleAnswer == tagName
        if(!isAnswered){
            const img = document.createElement('img')
            img.src = question_mark_path
            img.onload = () => {
                let width = img.width / scale
                let height = img.height / scale
                drawNewImage(img, coordinates, width, height)
                imgCanvas.appendChild(img)
            }
        }
        else{
            drawNewText(tagName, coordinates)
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


const drawTextBackground = async (ctx, txt, x, y, font, padding) => {
    return new Promise((resolve) => {
        ctx.textBaseline = "top";
        ctx.fillStyle = "#f7faf8";
        ctx.font = font
        var width = ctx.measureText(txt).width;
        ctx.fillRect(x, y, width + padding, parseInt(font, 10) + padding);

        ctx.lineWidth = 2;
        ctx.strokeStyle = "#f7faf8";
        ctx.strokeRect(x, y, width + padding, parseInt(font, 10) + padding);
        requestAnimationFrame(() => {
          resolve();
        });
    })
}

const drawNewText = async (txt, currCoordinates) => {
    const ctx = imgCanvas.getContext('2d')
    let font = `${fontSize}px Arial`
    let padding = 1
    ctx.font = font;
    let x = currCoordinates['x']
    let y = currCoordinates['y']
    await drawTextBackground(ctx, txt, x, y, font, padding)
    await drawTextBackground(ctx, txt, x, y, font, padding)
    ctx.fillStyle = "#070808";
    ctx.font = font;
    ctx.fillText(txt, x , y + padding )
   // ctx.restore();
    

}

const setBaseImage = async (img, x, y) => {
    return new Promise((resolve) => {
        const ctx = imgCanvas.getContext("2d");  
        img.onload = () => {
            let width = img.width;
            let height = img.height;
            let scaledWidth = width * scale
            let scaledHeight = height * scale
            ctx.canvas.width = scaledWidth
            ctx.canvas.height = scaledHeight
            ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
            scaleImage()
        }
        requestAnimationFrame(() => {
            resolve();
          });
    })
}

const drawNewImage = (img, currCoordinates, width, height) => {
    const ctx = imgCanvas.getContext("2d");
    let x = currCoordinates['x']
    let y = currCoordinates['y']
    ctx.drawImage(img, x, y - 15, width, height);
}

imgCanvas.addEventListener('click', (event) => {
    const rect = imgCanvas.getBoundingClientRect();
    const x = (event.clientX - rect.left);
    const y = (event.clientY - rect.top);
    for(let key in bodyPartCoordinates){

        let coordinates = bodyPartCoordinates[key]
        let tagX = parseFloat(coordinates['x']) * scale
        let tagY = parseFloat(coordinates['y']) * scale
        const img = document.createElement('img')
        img.src = question_mark_path  
        let width = img.width / scale
        let height = img.height / scale

        if (x >= tagX && x <= tagX + width && y >= tagY - 15 && y <= tagY + height - 15) {
            setupTagQuestion(coordinates, key)    
        }
    }
})

const setupTagQuestion = async (coordinates, key) => {
    let tagName = coordinates['name']
    let categoryId = coordinates['category']
    let prompt = 'Enter Tag'
    if(categoryId){
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

bodyTagBtn.addEventListener('click', () => {
    let txt = bodyTagTxt.value

    if(txt){
        let id = Object.keys(answerTag)[0]
        let answer = answerTag[id]
        if(txt.toLowerCase() == answer.toLowerCase()){
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