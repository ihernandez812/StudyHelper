

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

// Size of a pill in image space, so it can be compared with stored
// tag coordinates. The font isn't scaled when drawing, so a pill
// covers more image space as scale goes down.
const getPillSize = (canvas, label, fontSize, scale) => {
    const ctx = canvas.getContext('2d')
    const { width, height } = measurePill(ctx, label, parseInt(fontSize))

    return {
        width:  width  / scale,
        height: height / scale,
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
// area matches the pill on screen. Checks in reverse draw order so the
// pill painted on top wins when two overlap.
const checkCoordinatesExist = (canvas, x, y, coordinatesMap, scale, fontSize, getLabel) => {
    const keys = Object.keys(coordinatesMap).reverse()

    for (const key of keys) {
        const coordinates       = coordinatesMap[key]
        const { width, height } = getPillSize(canvas, getLabel(coordinates, key), fontSize, scale)
        const tagX              = parseFloat(coordinates['x'])
        const tagY              = parseFloat(coordinates['y'])

        if (x >= tagX && x <= tagX + width && y >= tagY && y <= tagY + height) {
            return key
        }
    }

    return null
}

// Screen point → image-space point on this canvas. Takes the canvas
// explicitly so it also works when the event target isn't the canvas
// (e.g. dropping a word bank chip onto it).
const getCanvasPoint = (canvas, clientX, clientY, scale) => {
    const rect = canvas.getBoundingClientRect()

    return {
        x: (clientX - rect.left) / scale,
        y: (clientY - rect.top)  / scale,
    }
}

const getClickCoordinates = (event, scale) => {
    return getCanvasPoint(event.target, event.clientX, event.clientY, scale)
}

const DRAG_THRESHOLD    = 3  // screen px before a press counts as a drag
const OFF_CANVAS_MARGIN = 24 // screen px past the edge before a drop reverts

// Lets the user left-drag items drawn on a canvas. Callbacks describe the
// items and apply the move; all points are image space. Right-click is
// left alone. Releasing well outside the canvas puts the item back where
// it started. Returns a function that removes the listeners.
//   hitTest(point)        → key | null
//   getPosition(key)      → {x, y} top-left of the item
//   getSize(key)          → {width, height}, used to keep it inside the image
//   onDragMove(key, pos)  → pos is offset by the grab point and clamped
//   onDragEnd(key, pos)   → optional, only fires if the item actually moved
const enableCanvasDrag = (canvas, { getScale, hitTest, getPosition, getSize, onDragMove, onDragEnd, threshold = DRAG_THRESHOLD }) => {
    let drag = null

    const toPoint = (e) => getCanvasPoint(canvas, e.clientX, e.clientY, getScale())

    const clamp = (key, x, y) => {
        const scale             = getScale()
        const { width, height } = getSize(key)
        const maxX              = Math.max(0, canvas.width  / scale - width)
        const maxY              = Math.max(0, canvas.height / scale - height)

        return {
            x: Math.min(Math.max(x, 0), maxX),
            y: Math.min(Math.max(y, 0), maxY),
        }
    }

    // Screen-space check, so the margin feels the same at any scale
    const isOffCanvas = (e) => {
        const rect = canvas.getBoundingClientRect()

        return e.clientX < rect.left   - OFF_CANVAS_MARGIN
            || e.clientX > rect.right  + OFF_CANVAS_MARGIN
            || e.clientY < rect.top    - OFF_CANVAS_MARGIN
            || e.clientY > rect.bottom + OFF_CANVAS_MARGIN
    }

    const updateHoverCursor = (e) => {
        canvas.style.cursor = hitTest(toPoint(e)) != null ? 'grab' : ''
    }

    const onPointerDown = (e) => {
        if (e.button !== 0) {
            return
        }

        const point = toPoint(e)
        const key   = hitTest(point)

        if (key == null) {
            return
        }

        const pos    = getPosition(key)
        const origin = { x: parseFloat(pos.x), y: parseFloat(pos.y) }

        drag = {
            key,
            origin,
            pointerId: e.pointerId,
            startX:    e.clientX,
            startY:    e.clientY,
            // Where inside the item it was grabbed, so it doesn't jump to the cursor
            offsetX:   point.x - origin.x,
            offsetY:   point.y - origin.y,
            moved:     false,
            last:      origin,
        }

        canvas.setPointerCapture(e.pointerId)
        e.preventDefault()
    }

    const onPointerMove = (e) => {
        if (!drag) {
            updateHoverCursor(e)
            return
        }

        if (e.pointerId !== drag.pointerId) {
            return
        }

        if (!drag.moved) {
            if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < threshold) {
                return
            }

            drag.moved = true
        }

        if (isOffCanvas(e)) {
            canvas.style.cursor = 'not-allowed'
            drag.last = drag.origin
        } else {
            canvas.style.cursor = 'grabbing'
            const point = toPoint(e)
            drag.last = clamp(drag.key, point.x - drag.offsetX, point.y - drag.offsetY)
        }

        onDragMove(drag.key, drag.last)
    }

    // Shared by pointerup and pointercancel
    const endDrag = (e, revert) => {
        if (!drag || e.pointerId !== drag.pointerId) {
            return
        }

        const { key, moved, origin } = drag
        let { last } = drag
        drag = null

        if (moved && revert) {
            last = origin
            onDragMove(key, origin)
        }

        if (moved && onDragEnd) {
            onDragEnd(key, last)
        }
    }

    const onPointerUp = (e) => {
        endDrag(e, drag != null && isOffCanvas(e))
        updateHoverCursor(e)
    }

    const onPointerCancel = (e) => {
        endDrag(e, true)
        canvas.style.cursor = ''
    }

    canvas.addEventListener('pointerdown',   onPointerDown)
    canvas.addEventListener('pointermove',   onPointerMove)
    canvas.addEventListener('pointerup',     onPointerUp)
    canvas.addEventListener('pointercancel', onPointerCancel)

    return () => {
        canvas.removeEventListener('pointerdown',   onPointerDown)
        canvas.removeEventListener('pointermove',   onPointerMove)
        canvas.removeEventListener('pointerup',     onPointerUp)
        canvas.removeEventListener('pointercancel', onPointerCancel)
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

// Repaints the already-decoded image and calls drawOverlay(canvas) to draw
// whatever sits on top (tags, '?' marks, drop highlights). Synchronous and
// doesn't resize the canvas, so it's cheap enough to call on every pointer
// move. Assumes a prior drawNewImage at this scale sized the canvas.
const redrawSync = (canvas, imgElement, drawOverlay, scale = 1) => {
    if (!imgElement.complete || imgElement.naturalWidth === 0) {
        return
    }

    const ctx = canvas.getContext('2d')

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(imgElement, 0, 0, imgElement.naturalWidth * scale, imgElement.naturalHeight * scale)
    drawOverlay(canvas)
}

const drawTags = (canvas, coordinatesMap, fontSize, scale = 1) => {
    for (const key in coordinatesMap) {
        const coordinates = coordinatesMap[key]
        drawNewText(canvas, coordinates['name'], coordinates, scale, fontSize)
    }
}

const drawBodyPartWithTags = async (canvas, imgElement, coordinatesMap, fontSize, scale = 1) => {
    await drawNewImage(canvas, imgElement, 0, 0, scale)
    requestAnimationFrame(() => drawTags(canvas, coordinatesMap, fontSize, scale))
}

export {
    drawNewImage,
    drawNewText,
    drawNewQuestionMark,
    checkCoordinatesExist,
    getPillSize,
    getCanvasPoint,
    getClickCoordinates,
    enableCanvasDrag,
    redrawSync,
    drawTags,
    clearCanvas,
    redrawEverything,
    drawBodyPartWithTags,
    TAG_COLORS,
}