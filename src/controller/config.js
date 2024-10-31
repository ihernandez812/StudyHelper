const myImage = document.querySelector('#bodyPart');
const bodyTagModalElement = document.querySelector("#body_tag_modal")
const bodyTagBtn = document.querySelector('#tag_btn')
const bodyTagTxt = document.querySelector("#body_tag")
const bodyPartModalElement = document.querySelector("#body_part_modal")
const bodyPartBtn = document.querySelector('#body_part_btn')
const bodyPartTxt = document.querySelector("#body_part")
const imgCanvas = document.querySelector("#img_canvas")
const dropArea = document.querySelector('#body_part_area');
const newBodyPartBtn = document.querySelector("#new_body_part")
const saveChecklistBtn = document.querySelector("#save_checklist")
const checklistTitleTxt = document.querySelector("#checklist_title")
const title = document.querySelector('title')
const bodyTagModal = new bootstrap.Modal(bodyTagModalElement)
const bodyPartModal = new bootstrap.Modal(bodyPartModalElement)
let noImgPath = '../images/no_image.jpeg'
let coordinatesMap = {}
let isBodyPartSaved = false
let bodyPartId = null
let checklistId = null
const bodyPartMap = {}
const checklistMap = {}
let currCoordinates = null

window.addEventListener('load', (e) => {
    setNoImage()
    let editBodyPartList = window.api.getEditBodyPart()
    if(editBodyPartList){
        let editBodyPart = editBodyPartList[0]
        bodyPartId = editBodyPartList[1]
        window.api.clearEditBodyPart()
        setupEditBodyPart(editBodyPart, bodyPartId)
    }
})

// Prevent default behavior (Prevent file from being opened)
dropArea.addEventListener('dragover', (event) => {
    event.preventDefault();
});

dropArea.addEventListener('drop', (event) => {
    event.preventDefault();
    event.stopPropagation();
    if(!isBodyPartSaved && Object.keys(coordinatesMap).length > 0){
        alert('Big dog save the body part')
    } else{
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
        let bodyTagId = await window.api.generateId()
        currCoordinates['name'] = txt
        coordinatesMap[bodyTagId] = currCoordinates
        bodyTagModal.hide()
        drawNewText(txt, currCoordinates)
        currCoordinates = null
        
    }
    else {
        alert('You gotta type something big dog')
    }


})

newBodyPartBtn.addEventListener('click', () => {
    bodyPartModal.show()
})

bodyPartBtn.addEventListener('click', async () => {
    let txt = bodyPartTxt.value
    if(txt){
        let bodyPart = {
            'name': txt,
            'img': myImage.src,
            'coordinates': coordinatesMap
        }
        if(bodyPartId == null){
            bodyPartId = await window.api.generateId()
        }
        bodyPartMap[bodyPartId] = bodyPart
        isBodyPartSaved = true
        bodyPartId = null
        coordinatesMap = {}
        reloadBodyPart()
    } 
    else{
        alert('You gotta type something big dog')
    }
})

saveChecklistBtn.addEventListener('click', async () => {
    let txt = checklistTitleTxt.value
    if(txt){
        let checklist = {}
        if(Object.keys(bodyPartMap).length > 0){
            checklist = {
                'name': txt,
                'bodyParts': bodyPartMap
            }
            if(checklistId == null){
                checklistId = await window.api.generateId()
            }
            
            window.api.addChecklist(checklistId, checklist)
            window.api.reloadHome()
            reloadChecklist()
            reloadBodyPart()
        } 
        else{
            alert("You gotta add body parts big dog")
        }
    }
    else{
        alert('You gotta type something big dog')
    }
})

const reloadChecklist = () => {
    checklistTitleTxt.value = ''
    checklistId = null
    for(let key in bodyPartMap){
        delete bodyPartMap[key]
    }
}

const reloadBodyPart = () => {
    bodyPartModal.hide()
    bodyPartTxt.value = ''
    setNoImage()
}

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
    //console.log(ctx)
    ctx.fillText(txt, x , y + padding )
    ctx.restore();
    

}

const getClickCoordinates = (event) => {
    const image = event.target;
    const rect = image.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    currCoordinates = {
        x: x,
        y: y
    }
    bodyTagModal.show()
}

const populateEditChecklistBodyParts = (bodyParts) => {
    for(let key in bodyParts){
        bodyPartMap[key] = bodyParts[key]
    }
}

const setupEditBodyPart = async (bodyPart, id) => {
    let image = bodyPart['img']
    coordinatesMap = bodyPart['coordinates']
    let checklistAndIdPair = window.api.getChecklistByBodyPartId(id)
    let checklist = checklistAndIdPair[0]
    checklistId = checklistAndIdPair[1]
    populateEditChecklistBodyParts(checklist['bodyParts'])
    checklistTitleTxt.value = checklist['name']
    bodyPartTxt.value = bodyPart['name']
    myImage.src = image
    title.innerHTML = 'Edit Checklist'
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


imgCanvas.addEventListener('contextmenu', getClickCoordinates);