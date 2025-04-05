const question_mark_path = '../images/question-mark.png'

const drawNewImage = async (canvas, imgElement, x, y, scale) => {
    return new Promise((resolve) => {
        
        const ctx = canvas.getContext("2d");
        imgElement.onload = async () => {
            let width = imgElement.width;
            let height = imgElement.height;
            ctx.canvas.width = width * scale;
            ctx.canvas.height = height * scale;
            ctx.drawImage(imgElement, x, y, width * scale, height * scale);
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

const drawNewText = async (canvas, txt, currCoordinates, fontSize, fillColor='#f7faf8') => {
    const ctx = canvas.getContext('2d')
    let font = `${fontSize}px Arial`
    console.log(font)
    let padding = 1
    ctx.font = font;
    console.log(ctx.font)
    let x = currCoordinates['x']
    let y = currCoordinates['y']
    
    await drawTextBackground(ctx, txt, x, y, font, padding, fillColor)
    await drawTextBackground(ctx, txt, x, y, font, padding, fillColor)
    await drawTextBackground(ctx, txt, x, y, font, padding, fillColor)
    await drawTextBackground(ctx, txt, x, y, font, padding, fillColor)
    ctx.fillStyle = "#070808";
    ctx.fillText(txt, x , y + padding)

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

const checkCoordinatesExist = (canvas, x, y, coordinatesMap, scale, isText, hasOffest=false) => {
    let foundKey = null
    let offset = 0
    if(hasOffest){
        //offset = -15
    }
    for(let key in coordinatesMap){
        
        let coordinates = coordinatesMap[key]
        let imgBounds = getWidthAndHeightOfCoordinate(canvas, coordinates, scale, isText)
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

const checkCoordinatesExistList = (canvas, x, y, coordinatesList, scale, isText, checkAnswer=false) => {
    let foundKey = null
    let offset = 0

    for(let i=0; i<coordinatesList.length; i++){
        let coordinates = coordinatesList[i]
        let tagX = parseFloat(coordinates['x'])
        let tagY = parseFloat(coordinates['y'])

        let imgBounds = getWidthAndHeightOfCoordinate(canvas, coordinates, scale, isText, checkAnswer)
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

const getWidthAndHeightOfCoordinate = (canvas, coordinates, scale, isText, checkAnswer=false) => {
    let imgBounds = {}
    if(isText){
        imgBounds = getWidthAndHeightOfText(canvas, coordinates, checkAnswer)
    }  
    else{
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

const getWidthAndHeightOfText = (canvas, coordinates, checkAnswer) => {
    let tagName = ''
    if(checkAnswer){
        tagName = coordinates['answer'] || 'No Answer'
    }
    else{
        tagName = coordinates['name']
    }
    let ctx = canvas.getContext('2d')
    let metrics = ctx.measureText(tagName);
    console.log(ctx.font)
    let width = metrics.width;
    let fontHeight = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;

    return {
        width: width,
        height: fontHeight
    }
}

const getClickCoordinates = (event, scale) => {
    const image = event.target;
    const rect = image.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    let deltaX = x / scale
    let deltaY = y / scale

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

const redrawEverything = async (canvas, imgElement, coordinatesMap, fontSize) => {
    let image = imgElement.src
    clearCanvas(canvas)
    imgElement.src = image
    drawBodyPartWithTags(canvas, imgElement, coordinatesMap, fontSize)
}

const drawBodyPartWithTags = async(canvas, imgElement, coordinatesMap, fontSize) => {
    await drawNewImage(canvas, imgElement, 0, 0, resizeScale)
    requestAnimationFrame(() => {
        for(let key in coordinatesMap){
            let coordinates = coordinatesMap[key]
            let tagName = coordinates['name']
            drawNewText(canvas, tagName, coordinates, fontSize)
        }
    })
}


const drawBodyPartWithQuestionMark = async(canvas, imgElement, coordinatesMap, fontSize) => {
    await drawNewImage(canvas, imgElement, 0, 0, resizeScale)
    requestAnimationFrame(() => {
        for(let key in coordinatesMap){
            let coordinates = coordinatesMap[key]
            let tagName = coordinates['name']
            drawNewText(canvas, tagName, coordinates, fontSize)
        }
    })
}
