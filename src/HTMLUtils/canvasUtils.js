const question_mark_path = '../images/question-mark.png'

const drawNewImage = async (canvas, imgElement, x, y, scale) => {
    return new Promise((resolve) => {
        const ctx = canvas.getContext("2d");

        const draw = () => {
            const width  = imgElement.naturalWidth;
            const height = imgElement.naturalHeight;
            ctx.canvas.width  = width  * scale;
            ctx.canvas.height = height * scale;
            ctx.drawImage(imgElement, x, y, width * scale, height * scale);
            resolve();
        }

        if (imgElement.complete && imgElement.naturalWidth > 0) {
            draw()  // already loaded — draw immediately
        } else {
            imgElement.onload = draw  // not yet loaded — wait
        }
    })
    
}

const drawNewText = (canvas, txt, currCoordinates, fontSize) => {
    const ctx  = canvas.getContext('2d')
    const size = parseInt(fontSize)   // ← parse here
    const x    = currCoordinates['x']
    const y    = currCoordinates['y']

    const paddingX = 8
    const paddingY = 4
    const radius   = 6

    ctx.font         = `500 ${size}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
    ctx.textBaseline = 'top'

    const textWidth = ctx.measureText(txt).width
    const boxW      = textWidth + paddingX * 2
    const boxH      = size + paddingY * 2        // ← use size, not fontSize

    ctx.fillStyle = 'rgba(199, 91, 122, 0.88)'
    ctx.beginPath()
    ctx.roundRect(x, y, boxW, boxH, radius)
    ctx.fill()

    ctx.fillStyle = '#ffffff'
    ctx.fillText(txt, x + paddingX, y + paddingY)
}

const drawNewQuestionMark = (canvas, coordinates, scale) => {
    return new Promise((resolve) => {
        const img = document.createElement('img')
        img.src = question_mark_path
        img.onload = () => {
            let width = img.width / scale
            let height = img.height / scale
            let ctx = canvas.getContext("2d");
            let x = coordinates['x']
            let y = coordinates['y']
            ctx.drawImage(img, x, y, width, height);
            canvas.appendChild(img)
        }
        requestAnimationFrame(() => {
            resolve();
        });
    })
}

const checkCoordinatesExist = (canvas, x, y, coordinatesMap, scale, fontSize, isText, hasOffest=false) => {
    let foundKey = null
    let offset = 0
    if(hasOffest){
        //offset = -15
    }

    for(let key in coordinatesMap) {
        let coordinates = coordinatesMap[key]
        let imgBounds = getWidthAndHeightOfCoordinate(canvas, coordinates, scale, fontSize, isText)
        console.log(imgBounds)
        let width = imgBounds['width']
        let height = imgBounds['height']
        let tagX = parseFloat(coordinates['x'])
        let tagY = parseFloat(coordinates['y'])
        if (x >= tagX && x <= tagX + width && y >= tagY + offset && y <= tagY + height + offset) {
            foundKey = key
            break
          }
    }
    return foundKey
} 

const checkCoordinatesExistList = (canvas, x, y, coordinatesList, scale, fontSize, isText, checkAnswer=false) => {
    let foundKey = null
    let offset = 0

    for(let i=0; i<coordinatesList.length; i++){
        let coordinates = coordinatesList[i]
        let tagX = parseFloat(coordinates['x'])
        let tagY = parseFloat(coordinates['y'])

        let imgBounds = getWidthAndHeightOfCoordinate(canvas, coordinates, scale, fontSize, isText, checkAnswer)
        let width = imgBounds['width']
        let height = imgBounds['height']
        console.log(x >= tagX, x <= tagX + width, y >= tagY + offset, y <= tagY + height + offset)
        if (x >= tagX && x <= tagX + width && y >= tagY + offset && y <= tagY + height + offset) {
            foundKey = i
            break
          }
    }
    return foundKey
}

const getWidthAndHeightOfCoordinate = (canvas, coordinates, scale, fontSize, isText, checkAnswer=false) => {
    let imgBounds = {}

    if(isText){
        imgBounds = getWidthAndHeightOfText(canvas, coordinates, checkAnswer, fontSize)
    } else{
        imgBounds = getWidthAndHeightOfQuestionMark(scale)
    }

    return imgBounds
}

const getWidthAndHeightOfQuestionMark = (scale) => {
    const img = document.createElement('img')
    img.src = question_mark_path  
    let width = img.width / scale
    let height = img.height / scale
    return {
        width: width,
        height: height
    }
}

const getWidthAndHeightOfText = (canvas, coordinates, checkAnswer, fontSize) => {
    const tagName = checkAnswer
        ? (coordinates['answer'] || 'No Answer')
        : coordinates['name']

    const paddingX = 8
    const paddingY = 4
    const size     = parseInt(fontSize)

    const ctx = canvas.getContext('2d')
    ctx.font  = `500 ${size}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

    const textWidth = ctx.measureText(tagName).width

    return {
        width:  textWidth + paddingX * 2,
        height: size      + paddingY * 2
    }
}

const getClickCoordinates = (event, scale) => {
    const image = event.target;
    const rect = image.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    let deltaX = x / scale
    let deltaY = y / scale

    let currCoordinates = {
        x: deltaX,
        y: deltaY
    }
    

    return currCoordinates
}

const clearCanvas = (canvas) => {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save()
}

const redrawEverything = async (canvas, imgElement, coordinatesMap, fontSize, scale = 1) => {
    let image = imgElement.src
    clearCanvas(canvas)
    imgElement.src = image
    await drawBodyPartWithTags(canvas, imgElement, coordinatesMap, fontSize, scale)
}

const drawBodyPartWithTags = async (canvas, imgElement, coordinatesMap, fontSize, scale = 1) => {
    await drawNewImage(canvas, imgElement, 0, 0, scale)
    requestAnimationFrame(() => {
        for (let key in coordinatesMap) {
            let coordinates = coordinatesMap[key]
            let tagName = coordinates['name']
            drawNewText(canvas, tagName, coordinates, fontSize)
        }
    })
}

const drawBodyPartWithQuestionMark = async (canvas, imgElement, coordinatesMap, fontSize, scale = 1) => {
    await drawNewImage(canvas, imgElement, 0, 0, scale)
    requestAnimationFrame(() => {
        for (let key in coordinatesMap) {
            let coordinates = coordinatesMap[key]
            drawNewQuestionMark(canvas, coordinates, scale)
        }
    })
}
