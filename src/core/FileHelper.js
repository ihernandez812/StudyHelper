const { app } = require('electron');
const { readFile, writeFile, mkdir, rm } = require('fs/promises');
const path = require('path');
const userDataPath =  app.getPath('userData')
const baseDir = path.join(userDataPath, 'images');

const saveBodyPartImage = async (checklistId, bodyPartId, dataUrl) => {
    const dir      = path.join(baseDir, checklistId, bodyPartId)
    await mkdir(dir, { recursive: true })

    const base64   = dataUrl.replace(/^data:image\/\w+;base64,/, '')
    const buffer   = Buffer.from(base64, 'base64')
    const filePath = path.join(dir, 'image.png')
    await writeFile(filePath, buffer)

    return filePath
}

const deleteBodyPartImage = (checklistId, bodyPartId) => {
    let bodyPartPath = path.join(baseDir, checklistId, bodyPartId)
    rm(bodyPartPath, {recursive: true, force: true}).catch(err => {
        console.error(err)
    })
}

const deleteChecklistImages = (checklistId) => {
    let checklistPath = path.join(baseDir, checklistId);
    rm(checklistPath, {recursive: true, force: true}).catch(err => {
        console.error(err)
    })
}

const loadBodyPartImage = async (filePath) => {
    const buffer = await readFile(filePath)
    return `data:image/png;base64,${buffer.toString('base64')}`
}

module.exports = {
    saveBodyPartImage,
    deleteBodyPartImage,
    loadBodyPartImage,
    deleteChecklistImages,
}
