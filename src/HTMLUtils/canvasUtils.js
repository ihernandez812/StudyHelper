const drawNewImage = async (canvas, imgElement, img, x, y) => {
    return new Promise((resolve) => {
        const ctx = canvas.getContext("2d");
        imgElement.onload = async () => {
            ctx.canvas.width = myImage.width;
            ctx.canvas.height = myImage.height;
            ctx.drawImage(img, x, y);
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

const getClickCoordinates = (event, canvas, coordinatesMap) => {
    const image = event.target;
    const rect = image.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const ctx = canvas.getContext("2d");

    currCoordinates = {
        x: x,
        y: y
    }
    //Just incase they changed body tag categories 
    //at any point
    let doesCorridatesHaveElement = false
    for(let key in coordinatesMap){
        let coordinates = coordinatesMap[key]
        let tagName = coordinates['name']
        let category = coordinates['category']
        let metrics = ctx.measureText(tagName);
        let width = metrics.width;
        let fontHeight = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;
        let tagX = parseFloat(coordinates['x'])
        let tagY = parseFloat(coordinates['y'])
        if (x >= tagX && x <= tagX + width && y >= tagY && y <= tagY + fontHeight) {
            doesCorridatesHaveElement = true
          }
    }

    return {
        coordinates: currCoordinates,
        hasElement: doesCorridatesHaveElement
    }
}

const clearCanvas = (canvas) => {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

const redrawEverything = async (canvas, imgElement, bodyPart) => {
    clearCanvas(canvas)
    drawBodyPartWithTags(canvas, imgElement, bodyPart)
}

const drawBodyPartWithTags = async(canvas, imgElement, bodyPart) => {
    let image = bodyPart['img']
    imgElement.src = image
    await drawNewImage(canvas, imgElement, 0, 0)
    requestAnimationFrame(() => {
        for(let key in coordinatesMap){
            let coordinates = coordinatesMap[key]
            let tagName = coordinates['name']
            drawNewText(tagName, coordinates)
        }
    })
}

