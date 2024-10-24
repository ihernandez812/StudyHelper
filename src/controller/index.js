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
const wordbank = document.querySelector("#wordbank")
const bodyTagModal = new bootstrap.Modal(bodyTagModalElement)
const settingsModal = new bootstrap.Modal(settingsModalElement)
let question_mark_path = '../images/question-mark.png'
let bodyPartCoordinates = {}
let correctTags = []
let answerTag = ''
let hintTag = ''
let numHints = 0 

window.addEventListener('load', (e) => {
    setupbodyPartTest()
    configureSettings()
})

const addToWordBank = (word) => {
    let span = document.createElement('span')
    span.innerHTML = word
    span.classList.add('wordbank-word')
    wordbank.appendChild(span)
}

const setupWordBank = () => {
    let bodyPart = window.api.getCurrBodyPart()
    let title = bodyPart['name']
    coordinates = bodyPart['coordinates']
    for(let key in coordinates){
        addToWordBank(key)
    }

}

const updateWordBank = () => {
    for(let child of wordbank.children){
        let txt = child.innerHTML
        let isUsed = correctTags.includes(txt)
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
    hintTag = answerTag.substring(0, hintTag.length+1)
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
    let bodyPart = window.api.getCurrBodyPart()
    let title = bodyPart['name']
    checklistTitleTxt.value = title
    let image = bodyPart['img']
    myImage.src = image
    await setBaseImage(myImage, 0, 0)
    bodyPartCoordinates = bodyPart['coordinates']
    drawQuestionMarks(bodyPartCoordinates)
}

const drawQuestionMarks = (coordinates) => {
    for(let key in coordinates){
        let isAnswered = correctTags.includes(key)
        if(!isAnswered){
            const img = document.createElement('img')
            img.src = question_mark_path
            img.onload = () => {
                drawNewImage(img, coordinates[key])
                imgCanvas.appendChild(img)
            }
        }
        else{
            console.log(key, coordinates)
            drawNewText(key, coordinates[key])
        }
        
    }
}

const drawNewText = (txt, currCoordinates) => {
    requestAnimationFrame(() => {
        const ctx = imgCanvas.getContext('2d')
        ctx.font = "15px Arial"
        let coordinates = currCoordinates.split(' ')
        ctx.fillText(txt, coordinates[0], coordinates[1]);
    })   
    
}

const setBaseImage = async (img, x, y) => {
    return new Promise((resolve) => {
        const ctx = imgCanvas.getContext("2d");  
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

const drawNewImage = (img, currCoordinates) => {
    const ctx = imgCanvas.getContext("2d");
    let coordinates = currCoordinates.split(' ')
    ctx.drawImage(img, coordinates[0], coordinates[1] - 15);
}

imgCanvas.addEventListener('click', (event) => {
    const rect = imgCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    for(let key in bodyPartCoordinates){
        let coordinates = bodyPartCoordinates[key].split(' ')
        let tagX = parseFloat(coordinates[0])
        let tagY = parseFloat(coordinates[1])
        if (x >= tagX && x <= tagX + 17 && y >= tagY - 15 && y <= tagY + 5) {
            bodyTagModal.show()
            answerTag = key
          }
    }
})

bodyTagBtn.addEventListener('click', () => {
    let txt = bodyTagTxt.value

    if(txt){
        if(txt.toLowerCase() == answerTag.toLowerCase()){
            bodyTagModal.hide()
            correctTags.push(answerTag)
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