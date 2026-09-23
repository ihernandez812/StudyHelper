const { app } = require('electron');
const { writeFile, mkdir, rm, copyFile } = require('fs/promises');
const path = require('path');
const userDataPath =  app.getPath('userData')
const baseDir = path.join(userDataPath, 'images');

const DATA_URL_RE = /^data:image\/(\w+);base64,/

const IMAGE_FILENAME = 'image.png'

//Keys are stored with forward slashes regardless of platform so the same
//store file works on macOS and Windows. absPathFor() turns one back into a
//real path; nothing outside this file should ever see an absolute path.
const keyFor     = (parentId, bodyPartId) => `${parentId}/${bodyPartId}/${IMAGE_FILENAME}`
const absPathFor = (key) => path.join(baseDir, ...key.split('/'))

const saveBodyPartImage = async (parentId, bodyPartId, dataUrl) => {
    //Buffer.from(x, 'base64') silently skips invalid characters instead of
    //throwing, so anything that isn't a data URL has to be rejected up front
    //or it gets written out as a corrupt image.
    if (!DATA_URL_RE.test(dataUrl ?? '')) {
        throw new Error(`saveBodyPartImage expected a base64 image data URL, got: ${String(dataUrl).slice(0, 40)}`)
    }


    const base64   = dataUrl.replace(DATA_URL_RE, '')
    const key = keyFor(parentId, bodyPartId)
    await mkdir(path.dirname(absPathFor(key)), { recursive: true })
    await writeFile(absPathFor(key), Buffer.from(base64, 'base64'))
    return key
}

const deleteBodyPartImage = (parentId, bodyPartId) => {
    const bodyPartPath = path.join(baseDir, parentId, bodyPartId)
    return rm(bodyPartPath, {recursive: true, force: true})
}

const deleteImages = (parentId) => {
    const checklistPath = path.join(baseDir, parentId);
    return rm(checklistPath, {recursive: true, force: true})
}


//Snapshots an existing body part image into its own directory so the copy
//survives the original checklist being edited or deleted.
const copyBodyPartImage = async (srcKey, parentId, bodyPartId) => {
    const key = keyFor(parentId, bodyPartId)
    await mkdir(path.dirname(absPathFor(key)), { recursive: true })
    await copyFile(absPathFor(srcKey), absPathFor(key))
    return key
}

module.exports = {
    saveBodyPartImage,
    copyBodyPartImage,
    deleteBodyPartImage,
    deleteImages,
    absPathFor,
    baseDir
}
