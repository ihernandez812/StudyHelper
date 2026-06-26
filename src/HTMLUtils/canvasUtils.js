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

const drawNewText = (canvas, txt, currCoordinates, scale, fontSize) => {
    const ctx  = canvas.getContext('2d')
    const size = parseInt(fontSize)   // ← parse here
    const x    = currCoordinates['x'] * scale
    const y    = currCoordinates['y'] * scale

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

const drawNewQuestionMark = (canvas, coordinates, scale, fontSize) => {
    const ctx      = canvas.getContext('2d')
    const size     = parseInt(fontSize)
    const x        = coordinates['x'] * scale
    const y        = coordinates['y'] * scale
    const paddingX = 8
    const paddingY = 4
    const radius   = 6

    ctx.font         = `500 ${size}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
    ctx.textBaseline = 'top'

    const textWidth = ctx.measureText('?').width
    const boxW      = textWidth + paddingX * 2
    const boxH      = size      + paddingY * 2

    // Same pill style as tags but muted so it reads as "unanswered"
    ctx.fillStyle = 'rgba(168, 128, 144, 0.88)'  // --text-muted tone
    ctx.beginPath()
    ctx.roundRect(x, y, boxW, boxH, radius)
    ctx.fill()

    ctx.fillStyle = '#ffffff'
    ctx.fillText('?', x + paddingX, y + paddingY)
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
        console.log('tagX', tagX, 'tagY', tagY, 'X', x, 'y', y, 'width', width, 'height', height)
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
        imgBounds = getWidthAndHeightOfQuestionMark(canvas, scale, fontSize)
    }

    return imgBounds
}

const getWidthAndHeightOfQuestionMark = (canvas, scale, fontSize) => {
    const ctx      = canvas.getContext('2d')
    const size     = parseInt(fontSize)
    const paddingX = 8
    const paddingY = 4

    ctx.font         = `500 ${size}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
    ctx.textBaseline = 'top'

    const textWidth = ctx.measureText('?').width
    const boxW      = textWidth + paddingX * 2
    const boxH      = size      + paddingY * 2

    return {
        width: boxW,
        height: boxH
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
            drawNewText(canvas, tagName, coordinates, scale, fontSize)
        }
    })
}

const drawBodyPartWithQuestionMark = async (canvas, imgElement, coordinatesMap, fontSize, scale = 1) => {
    await drawNewImage(canvas, imgElement, 0, 0, scale)
    requestAnimationFrame(() => {
        for (let key in coordinatesMap) {
            let coordinates = coordinatesMap[key]
            drawNewQuestionMark(canvas, coordinates, scale, fontSize)
        }
    })
}
