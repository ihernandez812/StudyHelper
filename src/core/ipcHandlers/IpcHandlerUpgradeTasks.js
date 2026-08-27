const { ipcMain } = require('electron')

const {generateID} = require("id-generator.js");
ipcMain.handle('addIdsToChecklists', (event, checklists) => {
    let sanitizedChecklists = {}

    if (Array.isArray(checklists)) {
        for (const checklist of checklists) {
            const checklistName = Object.keys(checklist)[0]
            const bodyParts = checklist[checklistName]
            const checklistId = generateID('XXXX-XXXX-XXXX-XXXX', { letters: true, numbers: true })
            const sanitizedBodyParts = {}

            for (const bodyPartObj of bodyParts) {
                const bodyPartName = Object.keys(bodyPartObj)[0]
                const bodyPartId = generateID('XXXX-XXXX-XXXX-XXXX', { letters: true, numbers: true })
                const bodyPart = bodyPartObj[bodyPartName]

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
    for (const key in checklists) {
        const checklist = checklists[key]
        const bodyParts = checklist['bodyParts']

        for (const key in bodyParts) {
            const bodyPart = bodyParts[key]
            const coordinates = bodyPart['coordinates']
            const sanitizedCoordinates = {}

            for (const key in coordinates) {
                const coordinatesString = coordinates[key]

                if (typeof coordinatesString == 'string'){
                    const id = generateID('XXXX-XXXX-XXXX-XXXX', { letters: true, numbers: true })

                    const xCoordinate = coordinatesString.split(' ')[0]
                    const yCoordinate = coordinatesString.split(' ')[1]

                    sanitizedCoordinates[id] = {
                        name: key,
                        x: xCoordinate,
                        y: yCoordinate

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