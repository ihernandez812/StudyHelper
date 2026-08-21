const { app } = require('electron');
const { writeFile, mkdir, rm, copyFile } = require('fs/promises');
const path = require('path');
const userDataPath =  app.getPath('userData')
const baseDir = path.join(userDataPath, 'images');

const DATA_URL_RE = /^data:image\/(\w+);base64,/

const saveBodyPartImage = async (parentId, bodyPartId, dataUrl) => {
    //Buffer.from(x, 'base64') silently skips invalid characters instead of
    //throwing, so anything that isn't a data URL has to be rejected up front
    //or it gets written out as a corrupt image.
    if (!DATA_URL_RE.test(dataUrl ?? '')) {
        throw new Error(`saveBodyPartImage expected a base64 image data URL, got: ${String(dataUrl).slice(0, 40)}`)
    }

    const dir      = path.join(baseDir, parentId, bodyPartId)
    await mkdir(dir, { recursive: true })

    const base64   = dataUrl.replace(DATA_URL_RE, '')
    const buffer   = Buffer.from(base64, 'base64')
    const filePath = path.join(dir, 'image.png')
    await writeFile(filePath, buffer)

    return filePath
}

const deleteBodyPartImage = (parentId, bodyPartId) => {
    let bodyPartPath = path.join(baseDir, parentId, bodyPartId)
    rm(bodyPartPath, {recursive: true, force: true}).catch(err => {
        console.error(err)
    })
}

const deleteImages = (parentId) => {
    let checklistPath = path.join(baseDir, parentId);
    rm(checklistPath, {recursive: true, force: true}).catch(err => {
        console.error(err)
    })
}


//Snapshots an existing body part image into its own directory so the copy
//survives the original checklist being edited or deleted.
const copyBodyPartImage = async (srcPath, parentId, bodyPartId) => {
    const dir = path.join(baseDir, parentId, bodyPartId)
    await mkdir(dir, { recursive: true })

    const destPath = path.join(dir, 'image.png')
    await copyFile(srcPath, destPath)

    return destPath
}

module.exports = {
    saveBodyPartImage,
    copyBodyPartImage,
    deleteBodyPartImage,
    deleteImages,
}
