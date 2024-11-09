const timerElement = document.getElementById("timer"); // Replace "timer" with your element's ID
const checklistChooser = document.getElementById('checklist_chooser')
const canvasesContainer = document.querySelector(".canvases")
const stationTitle = document.querySelector("#station_title")
const createPracticalBtn = document.getElementById('create_practical_btn')
const bodyTagPropmt = document.querySelector('#body_tag_prompt')
const bodyTagTxt = document.querySelector("#body_tag")
const bodyTagBtn = document.querySelector('#tag_btn')
const nextStationBtn = document.querySelector("#next_station")
const practicalNameTxt = document.querySelector("#practical_name")
const savePracticalBtn = document.querySelector("#save_practical_btn")
const practicalModalElement = document.querySelector("#practical_modal")
const bodyTagModalElement = document.querySelector("#body_tag_modal")
const praticalChecklistModalElement = document.querySelector('#practical_text_checklist_modal')
const practicalModal = new bootstrap.Modal(practicalModalElement)
const bodyTagModal = new bootstrap.Modal(bodyTagModalElement)
const praticalChecklistModal = new bootstrap.Modal(praticalChecklistModalElement)
let question_mark_path = '../images/question-mark.png'
let timerInterval
let practicalDate = null
let checklists = {}
let stationBodyPartToTags = {}
let currStation = 0
let clickedStationId = null
let bodyTagPos = 0
let stations = []

window.onload = async () => {
    checklists = await window.api.getChecklists()
    for(let id in checklists){
        let checklist = checklists[id]
        let checklistName = checklist['name']
        let div = createCheckbox(id, checklistName)
        checklistChooser.appendChild(div)
    }
    praticalChecklistModal.show()
}

createPracticalBtn.addEventListener('click', async () => {
    let checklistCheckboxes = document.querySelectorAll('input[type="checkbox"')
    let checkedChecklists = []
    for(let checklistCheckbox of checklistCheckboxes){
        if(checklistCheckbox.checked){
            checkedChecklists.push(checklistCheckbox.value)
        }
    }
    let wasCreated = await createPracticalTest(checkedChecklists)
    if(wasCreated){
        praticalChecklistModal.hide()
        startPracticalTest()
    }

})

nextStationBtn.addEventListener('click', () => {
    //saveStationChoices()
    nextStation()
})

savePracticalBtn.addEventListener('click', async () => {
    let txt = practicalNameTxt.value
    if(txt){
        let practicalId = await window.api.generateId()
        let practical = {
            stations: stations,
            name: txt,
            date: practicalDate
        }
        window.api.addPractical(practicalId, practical)
        let grade = getPracticalGrade()
        practicalModal.hide()
        window.api.popup(`Practical Grade: ${grade}`).then(() => {
            window.api.closePracticalTest()
        })
    }
    else{
        window.api.popup('You Gotta Type Something Big Dog')
    }
})

const getPracticalGrade = () => {
    let correct = 0
    for(let station of stations){
        for(let bodyTag of station){
            //in case they didn't answer it
            let enteredAnswer = bodyTag['answer'] || ''
            let answer = bodyTag['name']
            if(enteredAnswer.toLowerCase() == answer.toLowerCase()){
                correct++
            }
        }
    }
    return `${correct}/40`
}

const initStation = () => {
    let canvases = document.querySelectorAll('.canvas-row')
    for(let canvas of canvases){
        canvas.remove()
    }
    timeLeft = 10
    stationBodyPartToTags = {}
}

const saveStationChoices = () => {
    // let bodyTags = []
    // for(let key in stationBodyPartToTags){
    //     bodyTags.push(...stationBodyPartToTags[key])
    // }
} 

const startPracticalTest = () => {
    setPracticalDate()
    nextStation()
}

const setPracticalDate = () =>{
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0'); // January is 0!
    const year = now.getFullYear();
    let hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    if(hours > 12){
        hours - 12
    }
    practicalDate = `${month}/${day}/${year} ${hours}:${minutes}`;
}

const nextStation = async () => {
    if(currStation < stations.length){
        initStation()
        let station = stations[currStation]
        await displayStation(station)
        currStation++
        addStationEventListeners()
        startTimer()
    }
    else{
        endPracticalTest()
    }
}

const endPracticalTest = () => {
    if(timerInterval){
        clearInterval(timerInterval)
    }
    practicalModal.show()
}

const checkTagClicked = (event, canvas, id, bodyTags) => {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        for(let i=0; i<bodyTags.length; i++){
            let bodyTag = bodyTags[i]
            let tagX = parseFloat(bodyTag['x'])
            let tagY = parseFloat(bodyTag['y'])
            let width = 17
            let height = 5
            let yDiff = 15
            let answer = bodyTag['answer']
            if(answer){
                let ctx = canvas.getContext('2d')
                let metrics = ctx.measureText(answer);
                width = metrics.width;
                height = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;
                tagX = parseFloat(bodyTag['x'])
                tagY = parseFloat(bodyTag['y'])
                yDiff = 0
            }
            //x >= tagX && x <= tagX + width && y >= tagY && y <= tagY + fontHeight
            if (x >= tagX && x <= tagX + width && y >= tagY - yDiff && y <= tagY + height) {
                clickedStationId = id
                bodyTagPos = i
                setupTagQuestion(bodyTag)
            }
        }
}

bodyTagBtn.addEventListener('click', async () => {
    let bodyTagsList = stationBodyPartToTags[clickedStationId]
    let coordinates = bodyTagsList[bodyTagPos]
    coordinates['answer'] = bodyTagTxt.value
    bodyTagsList[bodyTagPos] = coordinates
    stationBodyPartToTags[clickedStationId] = bodyTagsList
    await redrawBodyPart(clickedStationId)
    bodyTagModal.hide()
})

const addStationEventListeners = () => {
    console.log('')
    for(let id in stationBodyPartToTags){
        let bodyTags = stationBodyPartToTags[id]
        let canvas = document.querySelector(`#${id}`)
        canvas.addEventListener('click', (event) => {
            checkTagClicked(event, canvas, id, bodyTags)
        })
    }
}

const setupTagQuestion = async (coordinates) => {

    let enteredAnswer = coordinates['answer']
    let categoryId = coordinates['category']
    let prompt = 'Enter Tag'
    if(categoryId && categoryId !== 'null'){
        let category = await window.api.getCategoryById(categoryId)
        prompt = `What is this ${category}?`
    }

    bodyTagPropmt.innerHTML = prompt
    bodyTagTxt.value = ''
    if(enteredAnswer){
        bodyTagTxt.value = enteredAnswer
    } 
    bodyTagModal.show()
}

const redrawBodyPart = async (stationId) => {
    let stationBodyPart = stationBodyPartToTags[stationId]
    let canvas = document.querySelector(`#${stationId}`)
    let baseImage = canvas.querySelector('.img-fluid')
    let imgSrc = baseImage.src
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let img = document.createElement('img')
    img.src = imgSrc
    setBaseImage(img, canvas, 0, 0)
    for(let coordinates of stationBodyPart){
        let answer = coordinates['answer']
        if(answer){
            await drawNewText(answer, canvas, coordinates)
        }
        else{
            drawNewQuestion(canvas, coordinates)
        }
    }
    //addStationEventListeners()
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

const drawNewText = async (txt, canvas, currCoordinates) => {
    const ctx = canvas.getContext('2d')
    let font = "16px Arial"
    let padding = 1
    ctx.font = font;
    let x = currCoordinates['x']
    let y = currCoordinates['y']
    await drawTextBackground(ctx, txt, x, y, font, padding)
    await drawTextBackground(ctx, txt, x, y, font, padding)
    await drawTextBackground(ctx, txt, x, y, font, padding)
    ctx.fillStyle = "#070808";
    ctx.font = font;
    ctx.fillText(txt, x , y + padding )
   // ctx.restore();
    

}

const displayStation = async (station) => {
    stationTitle.value = `Station ${currStation+1}`
    for(let bodyTag of station){
        let bodyPartId = bodyTag['bodyPart']
        let bodyPartCanvas = document.querySelector(`#${bodyPartId}`)
        if(!bodyPartCanvas){
            let bodyPartRow = createBodyPartCanvas(bodyPartId)
            canvasesContainer.appendChild(bodyPartRow)
            bodyPartCanvas = bodyPartRow.querySelector('canvas')
            let checklistId = bodyTag['checklist']
            let bodyPart = await window.api.getBodyPartById(bodyPartId, checklistId)
            let img = bodyPartCanvas.querySelector('img')
            img.src = bodyPart['img']
            await setBaseImage(img, bodyPartCanvas, 0, 0)
        }
        drawNewQuestion(bodyPartCanvas, bodyTag)
        let bodyTagList = stationBodyPartToTags[bodyPartId] || []
        bodyTagList.push(bodyTag)
        stationBodyPartToTags[bodyPartId] = bodyTagList
    }
}

const drawNewQuestion = (canvas, coordinates) => {
        let isAnswered = false
        let id = `${coordinates['x']}_${coordinates['y']}`
        if(!isAnswered){
            const img = document.createElement('img')
            img.src = question_mark_path
            img.setAttribute('id', id)
            img.onload = () => {
                drawNewImage(img, canvas, coordinates)
                canvas.appendChild(img)
            }
        }
        // else{
        //     drawNewText(tagName, coordinates)
        // }
}

const drawNewImage = (img, canvas, currCoordinates) => {
    const ctx = canvas.getContext("2d");
    let x = currCoordinates['x']
    let y = currCoordinates['y']
    ctx.drawImage(img, x, y - 15);
}

const setBaseImage = async (img, bodyPartCanvas, x, y) => {
    return new Promise((resolve) => {
        const ctx = bodyPartCanvas.getContext("2d");  
        img.onload = () => {
            ctx.canvas.width = img.width;
            ctx.canvas.height = img.height;
            ctx.drawImage(img, x, y);
        }
        requestAnimationFrame(() => {
            resolve();
          });
    })
}

const createBodyPartCanvas = (id) =>{
    let row = document.createElement("div")
    row.classList.add('row')
    row.classList.add('canvas-row')
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

const createPracticalTest = async (checkedChecklists) => {
    let possibleBodyTagById = {}
    let usedBodyTags = {}
    let usedBodyTagNames = []
    let wasCreated = false
    for(let id of checkedChecklists){
        let checklist = checklists[id]
        let bodyParts = checklist['bodyParts']
        for(let bodyPartId in bodyParts){
            let bodyPart = bodyParts[bodyPartId]
            let bodyTags = bodyPart['coordinates']
            for(let bodyTagId in bodyTags){
                let bodyTag = bodyTags[bodyTagId]
                bodyTag['checklist'] = id
                bodyTag['bodyPart'] = bodyPartId
                possibleBodyTagById[bodyTagId] = bodyTag
            }
        }
    }

    //Practical consist of 40 questions so get 40 random ones
    for(let i=0; i<40; i++){
        let bodyTagId = getBodyTag(possibleBodyTagById, usedBodyTagNames)
        if(bodyTagId){
            let bodyTag = possibleBodyTagById[bodyTagId]
            let bodyTagName = bodyTag['name']
            usedBodyTags[bodyTagId] = bodyTag
            usedBodyTagNames.push(bodyTagName)
            delete possibleBodyTagById[bodyTagId]
        }
    }

    let numBodyTags = Object.keys(usedBodyTags).length
    //Practicals will always have 40 questions so if 
    //there aren't enough tags then you can't take one
    if(numBodyTags < 40){
        window.api.popup(`Not enough tags please add at least ${40-numBodyTags} more.`)
    }
    else{
        wasCreated = true
        createStations(usedBodyTags)
    }
    return wasCreated
}

const createStations = (bodyTags) => {
    stations = []
    let tagsPerStations = 3
    let pos = 0
    let bodyTagIds = Object.keys(bodyTags)
    for(let i=0; i<14; i++){
        if(i == 12){
            tagsPerStations = 2
        }
        let stationBodyTagIds = bodyTagIds.slice(pos, pos+=tagsPerStations)
        let stationBodyTags = []
        for(let stationBodyTagId of stationBodyTagIds){
            stationBodyTags.push(bodyTags[stationBodyTagId])
        }
        stations.push(stationBodyTags)
    }
}

const getBodyTag = (possibleBodyTagById, usedBodyTagNames) => {
    let possibleId = null
    let possibleBodyTags = Object.keys(possibleBodyTagById)
    //while we dont have the id and we still have ids to check then check
    while(possibleId == null && possibleBodyTags.length > 0){
        let index = Math.floor(Math.random() * possibleBodyTags.length)
        possibleId = possibleBodyTags[index]
        let possibleBodyTag = possibleBodyTagById[possibleId]
        let possibleName =  possibleBodyTag['name']
        if(usedBodyTagNames.includes(possibleName)){
            possibleId = null
        }

        //remove tags we've checked so we don't check them again
        possibleBodyTags.splice(index, 1)
    }
    return possibleId
}

const createCheckbox = (id, checklistName) => {
    let div = document.createElement('div')
    let input = document.createElement('input')
    let label = document.createElement('label')

    div.classList.add('form-check')
    input.classList.add('form-check-input')
    input.setAttribute('type', 'checkbox')
    input.value = id
    input.setAttribute('id', id)
    label.classList.add('form-check-label')
    label.setAttribute('for', id)
    label.innerHTML = checklistName

    div.append(input, label)
    return div
}


const startTimer = () => {
    let timeLeft = 120; // 2 minutes in seconds
    if(timerInterval){
        clearInterval(timerInterval)
    }
    timerInterval = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;

        timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        timeLeft--;
        if (timeLeft < 0) {
            clearInterval(timerInterval);
            saveStationChoices()
            window.api.popup("Times Up!").then(nextStation)
        }
    }, 1000); // 1000 milliseconds = 1 second
  }