const drawNewImage = async (canvas, imgElement, img, x, y, scale) => {
    return new Promise((resolve) => {
        const ctx = canvas.getContext("2d");
        imgElement.onload = async () => {
            let width = imgElement.width;
            let height = imgElement.height;
            ctx.canvas.width = width * scale;
            ctx.canvas.height = height * scale;
            ctx.drawImage(img, x, y, width * scale, height * scale);
            ctx.scale(scale, scale)
        }
        
        requestAnimationFrame(() => {
          resolve();
        });
    })
    
}


const drawTextBackground = async (ctx, txt, x, y, font, padding, fillColor) => {
    return new Promise((resolve) => {
        ctx.textBaseline = "top";
        ctx.fillStyle = fillColor

        var width = ctx.measureText(txt).width;
        ctx.fillRect(x, y, width + padding, parseInt(font, 10) + padding);

        ctx.lineWidth = 2;
        ctx.strokeStyle = fillColor
        ctx.strokeRect(x, y, width + padding, parseInt(font, 10) + padding);
        requestAnimationFrame(() => {
          resolve();
        });
    })
}

const drawNewText = async (canvas, txt, currCoordinates, fontSize) => {
    const ctx = canvas.getContext('2d')
    let font = `${fontSize} px Arial`
    let padding = 1
    ctx.font = font;
    let x = currCoordinates['x']
    let y = currCoordinates['y']
    
    await drawTextBackground(ctx, txt, x, y, font, padding, fillColor)
    ctx.fillStyle = "#070808";
    ctx.fillText(txt, x , y + padding )
    ctx.restore();
}

const checkCoordinatesExist = (ctx, x, y, coordinatesMap) => {
    let foundKey = null
    for(let key in coordinatesMap){
        let coordinates = coordinatesMap[key]
        let tagName = coordinates['name']
        let metrics = ctx.measureText(tagName);
        let width = metrics.width;
        let fontHeight = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;
        let tagX = parseFloat(coordinates['x'])
        let tagY = parseFloat(coordinates['y'])
        if (x >= tagX && x <= tagX + width && y >= tagY && y <= tagY + fontHeight) {
            foundKey = key
            break
          }
    }
    return foundKey
} 

const getClickCoordinates = (event) => {
    const image = event.target;
    const rect = image.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    let deltaX = x / resizeScale
    let deltaY = y / resizeScale

    currCoordinates = {
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

const redrawEverything = async (canvas, imgElement, coordinatesMap) => {
    let image = imgElement.src
    clearCanvas(canvas)
    imgElement.src = image
    drawBodyPartWithTags(canvas, imgElement, coordinatesMap)
}

const drawBodyPartWithTags = async(canvas, imgElement, coordinatesMap) => {
    drawNewImage(canvas, imgElement, 0, 0)
    requestAnimationFrame(() => {
        for(let key in coordinatesMap){
            let coordinates = coordinatesMap[key]
            let tagName = coordinates['name']
            drawNewText(tagName, coordinates)
        }
    })
}


module.exports = {
    drawNewImage, 
    drawNewText,
    checkCoordinatesExist,
    getClickCoordinates,
    redrawEverything,
    drawBodyPartWithTags
}
