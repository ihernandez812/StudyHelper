const { ipcMain } = require('electron')

const {generateID} = require("id-generator.js");
ipcMain.handle('addIdsToChecklists', (event, checklists) => {
    let sanitizedChecklists = {}

    if (Array.isArray(checklists)) {
        for (let checklist of checklists) {
            let checklistName = Object.keys(checklist)[0]
            let bodyParts = checklist[checklistName]
            let checklistId = generateID('XXXX-XXXX-XXXX-XXXX', { letters: true, numbers: true })
            let sanitizedBodyParts = {}

            for (let bodyPartObj of bodyParts) {
                let bodyPartName = Object.keys(bodyPartObj)[0]
                let bodyPartId = generateID('XXXX-XXXX-XXXX-XXXX', { letters: true, numbers: true })
                let bodyPart = bodyPartObj[bodyPartName]

                sanitizedBodyParts[bodyPartId] = {
                    name: bodyPartName,
                    coordinates: bodyPart['coordinates'],
                    img: bodyPart['img']
                }
            }

            sanitizedChecklists[checklistId] = {
                name: checklistName,
                bodyParts : sanitizedBodyParts
            }
        }
    } else {
        sanitizedChecklists = checklists
    }

    return sanitizedChecklists
})

ipcMain.handle('addIdsToTags', (event, checklists) => {
    for (let key in checklists) {
        let checklist = checklists[key]
        let bodyParts = checklist['bodyParts']

        for (let key in bodyParts) {
            let bodyPart = bodyParts[key]
            let coordinates = bodyPart['coordinates']
            let sanitizedCoordinates = {}

            for (let key in coordinates) {
                let coordinatesString = coordinates[key]

                if (typeof coordinatesString == 'string'){
                    let id = generateID('XXXX-XXXX-XXXX-XXXX', { letters: true, numbers: true })

                    let x_coordinate = coordinatesString.split(' ')[0]
                    let y_coordinate = coordinatesString.split(' ')[1]

                    sanitizedCoordinates[id] = {
                        name: key,
                        x: x_coordinate,
                        y: y_coordinate

                    }
                } else {
                    sanitizedCoordinates[key] = coordinatesString
                }
            }

            bodyPart['coordinates'] = sanitizedCoordinates
        }
    }

    return checklists
})