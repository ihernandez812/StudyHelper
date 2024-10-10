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
const bodyTagModal = new bootstrap.Modal(bodyTagModalElement)
const bodyPartModal = new bootstrap.Modal(bodyPartModalElement)
let noImgPath = '../images/no_image.jpeg'
let coordinatesMap = {}
const bodyPartList = []
let currCoordinates = null

window.addEventListener('load', (e) => {
    setNoImage()
})

// Prevent default behavior (Prevent file from being opened)
dropArea.addEventListener('dragover', (event) => {
    event.preventDefault();
});

dropArea.addEventListener('drop', (event) => {
    event.preventDefault();
    event.stopPropagation();

    const file = event.dataTransfer.files[0];
    if (file.type.startsWith("image/")) {
        const reader = new FileReader();

        reader.onload = (event) => {

            myImage.src = event.target.result;
            drawNewImage(myImage, 0, 0)
        };

        reader.readAsDataURL(file);
    }
});



bodyTagBtn.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    let txt = bodyTagTxt.value
    if (txt) {
        coordinatesMap[txt] = currCoordinates
        drawNewText(txt, currCoordinates)
        currCoordinates = null
        bodyTagModal.hide()
    }
    else {
        alert('You gotta type something big dog')
    }


})

newBodyPartBtn.addEventListener('click', () => {
    bodyPartModal.show()
})

bodyPartBtn.addEventListener('click', () => {
    let txt = bodyPartTxt.value
    if(txt){
        let bodyPart = {}
        bodyPart[txt] = {
            'img': myImage.src,
            'coordinates': coordinatesMap
        }
        bodyPartList.push(bodyPart)
        coordinatesMap = {}
        reloadBodyPart()
    } 
    else{
        alert('You gotta type something big dog')
    }
})

saveChecklistBtn.addEventListener('click', () => {
    let txt = checklistTitleTxt.value
    if(txt){
        let checklist = {}
        if(bodyPartList.length > 0){
            checklist[txt] = bodyPartList
            console.log(checklist)
            checklistTitleTxt.value = ''
            window.api.addChecklist(checklist)
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

const reloadBodyPart = () => {
    bodyPartModal.hide()
    bodyPartTxt.value = ''
    setNoImage()
}

const setNoImage = () => {
    myImage.src = noImgPath
    drawNewImage(myImage, 0, 0)
}

const drawNewImage = (img, x, y) => {
    const ctx = imgCanvas.getContext("2d");
    myImage.onload = () => {
        ctx.canvas.width = myImage.width;
        ctx.canvas.height = myImage.height;
        ctx.drawImage(img, x, y);
    }
}

const drawNewText = (txt, currCoordinates) => {
    const ctx = imgCanvas.getContext('2d')
    ctx.font = "15px Arial"
    let coordinates = currCoordinates.split(' ')
    ctx.fillText(txt, coordinates[0], coordinates[1]);
}

function getClickCoordinates(event) {
    const image = event.target;
    const rect = image.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    currCoordinates = `${x} ${y}`
    bodyTagModal.show()
}

imgCanvas.addEventListener('contextmenu', getClickCoordinates);