

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


const checkCoordinatesExist = (canvas, x, y, coordinatesMap, scale, fontSize, isText) => {
    let foundKey = null

    for(const key in coordinatesMap) {
        const coordinates = coordinatesMap[key]
        const imgBounds = getWidthAndHeightOfCoordinate(canvas, coordinates, scale, fontSize, isText)
        const width = imgBounds['width']
        const height = imgBounds['height']
        const tagX = parseFloat(coordinates['x'])
        const tagY = parseFloat(coordinates['y'])

        if (x >= tagX && x <= tagX + width / scale && y >= tagY && y <= tagY + height / scale) {
            foundKey = key
            break
          }
    }
    return foundKey
}

const getWidthAndHeightOfCoordinate = (canvas, coordinates, scale, fontSize, isText) => {
    if (isText) {
        return getWidthAndHeightOfText(canvas, coordinates, false, fontSize)
    }

    return getWidthAndHeightOfQuestionMark(canvas, scale, fontSize)
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

    const deltaX = x / scale
    const deltaY = y / scale

    return {
        x: deltaX,
        y: deltaY
    }
}

const clearCanvas = (canvas) => {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save()
}

const redrawEverything = async (canvas, imgElement, coordinatesMap, fontSize, scale = 1) => {
    const image = imgElement.src
    clearCanvas(canvas)
    imgElement.src = image
    await drawBodyPartWithTags(canvas, imgElement, coordinatesMap, fontSize, scale)
}

const drawBodyPartWithTags = async (canvas, imgElement, coordinatesMap, fontSize, scale = 1) => {
    await drawNewImage(canvas, imgElement, 0, 0, scale)
    requestAnimationFrame(() => {
        for (const key in coordinatesMap) {
            const coordinates = coordinatesMap[key]
            const tagName = coordinates['name']
            drawNewText(canvas, tagName, coordinates, scale, fontSize)
        }
    })
}

export {
    drawNewImage,
    drawNewText,
    drawNewQuestionMark,
    checkCoordinatesExist,
    getClickCoordinates,
    clearCanvas,
    redrawEverything,
    drawBodyPartWithTags
}