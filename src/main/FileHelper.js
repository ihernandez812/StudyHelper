const { app } = require('electron')
const { existsSync, mkdirSync, writeFileSync, copyFileSync, renameSync } = require('fs')
const { rm } = require('fs/promises')
const path = require('path')

const imagesDirectory = path.join(app.getPath('userData'), 'images')

const DATA_URL_PATTERN = /^data:image\/(\w+);base64,/
const IMAGE_FILENAME = 'image.png'
const CHECKLIST_FOLDER = 'checklists'
const PRACTICAL_FOLDER = 'practicals'

//Keys are stored with forward slashes regardless of platform.
//absolutePathForKey() turns one back into a real path; nothing outside this
//file should ever see an absolute path.
const absolutePathForKey = (key) => {
    return path.join(imagesDirectory, ...key.split('/'))
}

const bodyPartImageKey = (checklistId, bodyPartId) => {
    return `${CHECKLIST_FOLDER}/${checklistId}/${bodyPartId}/${IMAGE_FILENAME}`
}

const practicalStationImageKey = (practicalId, stationId) => {
    return `${PRACTICAL_FOLDER}/${practicalId}/${stationId}/${IMAGE_FILENAME}`
}

const isImageDataUrl = (value) => {
    return typeof value === 'string' && DATA_URL_PATTERN.test(value)
}

//Synchronous so it can run inside a database transaction: if the write
//throws, the row that would have pointed at it is rolled back.
const saveImage = (key, dataUrl) => {
    //Buffer.from(x, 'base64') silently skips invalid characters instead of
    //throwing, so anything that isn't a data URL has to be rejected up front.
    if (!isImageDataUrl(dataUrl)) {
        throw new Error(`saveImage expected a base64 image data URL, got: ${String(dataUrl).slice(0, 40)}`)
    }

    const base64 = dataUrl.replace(DATA_URL_PATTERN, '')
    mkdirSync(path.dirname(absolutePathForKey(key)), { recursive: true })
    writeFileSync(absolutePathForKey(key), Buffer.from(base64, 'base64'))
    return key
}

//Synchronous for the same reason as saveImage
const copyImage = (sourceKey, key) => {
    mkdirSync(path.dirname(absolutePathForKey(key)), { recursive: true })
    copyFileSync(absolutePathForKey(sourceKey), absolutePathForKey(key))
    return key
}

//Moves a folder aside instead of deleting it so a failed transaction never
//leaves rows pointing at missing images. renameSync is atomic: the folder
//either moves completely or not at all. Returns null when there was nothing
//to move.
const moveToTrash = (folder) => {
    if (!existsSync(folder)) {
        return null
    }

    const trashFolder = `${folder}.deleting-${Date.now()}`
    renameSync(folder, trashFolder)
    return trashFolder
}

const moveBodyPartImagesToTrash = (checklistId, bodyPartId) => {
    return moveToTrash(path.join(imagesDirectory, CHECKLIST_FOLDER, String(checklistId), String(bodyPartId)))
}

const moveChecklistImagesToTrash = (checklistId) => {
    return moveToTrash(path.join(imagesDirectory, CHECKLIST_FOLDER, String(checklistId)))
}

const movePracticalImagesToTrash = (practicalId) => {
    return moveToTrash(path.join(imagesDirectory, PRACTICAL_FOLDER, String(practicalId)))
}

const emptyTrash = async (trashFolder) => {
    if (!trashFolder) {
        return
    }

    await rm(trashFolder, { recursive: true, force: true })
}

module.exports = {
    imagesDirectory,
    absolutePathForKey,
    bodyPartImageKey,
    practicalStationImageKey,
    isImageDataUrl,
    saveImage,
    copyImage,
    moveBodyPartImagesToTrash,
    moveChecklistImagesToTrash,
    movePracticalImagesToTrash,
    emptyTrash,
}
