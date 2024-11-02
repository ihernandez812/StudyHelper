const myImage = document.querySelector('#bodyPart');
const bodyTagModalElement = document.querySelector("#body_tag_modal")
const bodyTagBtn = document.querySelector('#tag_btn')
const bodyTagTxt = document.querySelector("#body_tag")
const imgCanvas = document.querySelector("#img_canvas")
const dropArea = document.querySelector('#body_part_area');
const saveBodyPartBtn = document.querySelector("#save_body_part")
const bodyPartTitleTxt = document.querySelector("#body_part_title")
const title = document.querySelector('title')
const bodyTagTitle = document.querySelector("#body_tag_title")
const bodyTagModal = new bootstrap.Modal(bodyTagModalElement)
let noImgPath = '../images/no_image.jpeg'
let coordinatesMap = {}
let isEdit = false
let bodyPartId = null
let checklistId = null
let bodyTagId = null
let currCoordinates = null

window.addEventListener('load', (e) => {
    setNoImage()
    bodyPartId = window.api.getEditBodyPart()
    checklistId = window.api.getCurrChecklist()
    if(checklistId){
        if(bodyPartId){
            isEdit = true
            setupEditBodyPart(bodyPartId, checklistId)
            window.api.clearEditBodyPart()
        } else{
            setupAddBodyPart(checklistId)
        }
        window.api.clearCurrChecklist()
    }
})

// Prevent default behavior (Prevent file from being opened)
dropArea.addEventListener('dragover', (event) => {
    event.preventDefault();
});

dropArea.addEventListener('drop', (event) => {
    event.preventDefault();
    event.stopPropagation();
    if(!isEdit){
        const file = event.dataTransfer.files[0];
        if (file.type.startsWith("image/")) {
            const reader = new FileReader();

            reader.onload = async (event) => {

                myImage.src = event.target.result;
                await drawNewImage(myImage, 0, 0)
            };

            reader.readAsDataURL(file);
        }
    }
});



bodyTagBtn.addEventListener('click', async (event) => {
    event.preventDefault()
    event.stopPropagation()
    let txt = bodyTagTxt.value
    if (txt) {
        let wasEdited = bodyTagId != null
        if(wasEdited){
            currCoordinates = coordinatesMap[bodyTagId]
        }
        else if(!wasEdited){
            bodyTagId = await window.api.generateId()

        }
        currCoordinates['name'] = txt
        coordinatesMap[bodyTagId] = currCoordinates
        bodyTagModal.hide()
        if(wasEdited){
            redrawEverything()
        } else{
            drawNewText(txt, currCoordinates)
        }
        currCoordinates = null
        bodyTagTxt.value = null
        
    }
    else {
        alert('You gotta type something big dog')
    }


})

saveBodyPartBtn.addEventListener('click', async () => {
    let txt = bodyPartTitleTxt.value
    if(txt){
        let bodyPart = {
            'name': txt,
            'img': myImage.src,
            'coordinates': coordinatesMap
        }

        if(bodyPartId == null){
            bodyPartId = await window.api.generateId()
        }
        window.api.addOrEditBodyPartById(bodyPartId, checklistId, bodyPart)
        window.api.reloadHome()
        window.api.closeConfig()
        
    } 
    else{
        alert('You gotta type something big dog')
    }
})




const setNoImage = async () => {
    myImage.src = noImgPath
    await drawNewImage(myImage, 0, 0)
}

const drawNewImage = async (img, x, y) => {
    return new Promise((resolve) => {
        const ctx = imgCanvas.getContext("2d");
        myImage.onload = async () => {
            ctx.canvas.width = myImage.width;
            ctx.canvas.height = myImage.height;
            ctx.drawImage(img, x, y);
        }
        requestAnimationFrame(() => {
          resolve();
        });
    })
    
}

const drawTextBackground = async (ctx, txt, x, y, font, padding) => {
    return new Promise((resolve) => {
        ctx.textBaseline = "top";
        ctx.fillStyle = "#f7faf8";

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
    let font = "16px Arial"
    let padding = 1
    ctx.font = font;
    let x = currCoordinates['x']
    let y = currCoordinates['y']
    
    await drawTextBackground(ctx, txt, x, y, font, padding)
    ctx.fillStyle = "#070808";
    ctx.fillText(txt, x , y + padding )
    ctx.restore();
    

}

const getClickCoordinates = (event) => {
    const image = event.target;
    const rect = image.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const ctx = imgCanvas.getContext("2d");

    currCoordinates = {
        x: x,
        y: y
    }
    setupAddBodyTag()
    for(let key in coordinatesMap){
        let coordinates = coordinatesMap[key]
        let tagName = coordinates['name']
        let metrics = ctx.measureText(tagName);
        let width = metrics.width;
        let fontHeight = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;
        let tagX = parseFloat(coordinates['x'])
        let tagY = parseFloat(coordinates['y'])
        if (x >= tagX && x <= tagX + width && y >= tagY && y <= tagY + fontHeight) {
            setupEditBodyTag(key)
          }
    }
    bodyTagModal.show()
}



const setupEditBodyTag = (key) => {
    bodyTagId = key
    bodyTagTitle.innerHTML = 'Edit Tag'
}

const setupAddBodyTag = () => {
    bodyTagId = null
    bodyTagTitle.innerHTML = 'New Tag'
}

const redrawEverything = async () => {
    const ctx = imgCanvas.getContext("2d");
    ctx.clearRect(0, 0, imgCanvas.width, imgCanvas.height);
    let bodyPart = window.api.getBodyPartById(bodyPartId, checklistId)
    let image = bodyPart['img']
    myImage.src = image
    await drawNewImage(myImage, 0, 0)
    requestAnimationFrame(() => {
        for(let key in coordinatesMap){
            let coordinates = coordinatesMap[key]
            let tagName = coordinates['name']
            drawNewText(tagName, coordinates)
        }
    })
}


const setupEditBodyPart = async (bodyPartId, checklistId) => {
    let bodyPart = window.api.getBodyPartById(bodyPartId, checklistId)
    let checklist = window.api.getChecklistById(checklistId)
    let image = bodyPart['img']
    coordinatesMap = bodyPart['coordinates']
    bodyPartTitleTxt.value = bodyPart['name']
    myImage.src = image
    title.innerHTML = `Edit to ${checklist['name']} Checklist`
    await drawNewImage(myImage, 0, 0)
    requestAnimationFrame(() => {
        let bodyPartCoordinates = bodyPart['coordinates']
        for(let key in bodyPartCoordinates){
            let coordinates = bodyPartCoordinates[key]
            let tagName = coordinates['name']
            drawNewText(tagName, coordinates)
        }
    })
}

const setupAddBodyPart = async (checklistId) => {
    let checklist = window.api.getChecklistById(checklistId)
    title.innerHTML = `Add to ${checklist['name']} Checklist`
}



imgCanvas.addEventListener('contextmenu', getClickCoordinates);