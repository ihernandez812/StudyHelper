

const drawNewImage = async (canvas, imgElement, x, y, scale) => {
    //decode() resolves once the image is loaded and ready to paint, and
    //rejects if it can't be. The old complete/onload check got both cases
    //wrong: a broken image (complete:true, naturalWidth:0) hung forever, and
    //assigning the same src twice never fired onload at all.
    await imgElement.decode()

    const ctx    = canvas.getContext('2d')
    const width  = imgElement.naturalWidth
    const height = imgElement.naturalHeight

    ctx.canvas.width  = width  * scale
    ctx.canvas.height = height * scale
    ctx.drawImage(imgElement, x, y, width * scale, height * scale)
    
}

// Pill fills for tags drawn on a canvas. Canvas can't read CSS variables,
// so these mirror the theme by hand.
const TAG_COLORS = {
    DEFAULT:    'rgba(199, 91, 122, 0.88)',   // --accent
    UNANSWERED: 'rgba(168, 128, 144, 0.88)',  // --text-muted tone
    CORRECT:    'rgba(46, 140, 87, 0.9)',
    INCORRECT:  'rgba(196, 64, 64, 0.9)',
}

const PILL_PADDING_X = 8
const PILL_PADDING_Y = 4
const PILL_RADIUS    = 6

const setTagFont = (ctx, size) => {
    ctx.font         = `500 ${size}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
    ctx.textBaseline = 'top'
}

// Box size of a pill drawn by drawPill, in canvas pixels
const measurePill = (ctx, txt, size) => {
    setTagFont(ctx, size)

    return {
        width:  ctx.measureText(txt).width + PILL_PADDING_X * 2,
        height: size + PILL_PADDING_Y * 2,
    }
}

// Draws one rounded pill with its top-left at (x, y) in canvas pixels.
const drawPill = (ctx, txt, x, y, size, fillStyle) => {
    const { width: boxW, height: boxH } = measurePill(ctx, txt, size)

    ctx.fillStyle = fillStyle
    ctx.beginPath()
    ctx.roundRect(x, y, boxW, boxH, PILL_RADIUS)
    ctx.fill()

    ctx.fillStyle = '#ffffff'
    ctx.fillText(txt, x + PILL_PADDING_X, y + PILL_PADDING_Y)
}

const drawNewText = (canvas, txt, currCoordinates, scale, fontSize, fillStyle = TAG_COLORS.DEFAULT) => {
    const ctx = canvas.getContext('2d')
    const x   = currCoordinates['x'] * scale
    const y   = currCoordinates['y'] * scale

    drawPill(ctx, txt, x, y, parseInt(fontSize), fillStyle)
}

// Same pill style as tags but muted so it reads as "unanswered"
const drawNewQuestionMark = (canvas, coordinates, scale, fontSize) => {
    drawNewText(canvas, '?', coordinates, scale, fontSize, TAG_COLORS.UNANSWERED)
}



// getLabel(tag, key) returns the text drawn for that tag, so the click
// area matches the pill on screen
const checkCoordinatesExist = (canvas, x, y, coordinatesMap, scale, fontSize, getLabel) => {
    const ctx  = canvas.getContext('2d')
    const size = parseInt(fontSize)

    for (const key in coordinatesMap) {
        const coordinates       = coordinatesMap[key]
        const { width, height } = measurePill(ctx, getLabel(coordinates, key), size)
        const tagX              = parseFloat(coordinates['x'])
        const tagY              = parseFloat(coordinates['y'])

        if (x >= tagX && x <= tagX + width / scale && y >= tagY && y <= tagY + height / scale) {
            return key
        }
    }

    return null
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
    drawBodyPartWithTags,
    TAG_COLORS,
}