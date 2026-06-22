const { readFile, writeFile, mkdir, rm } = require('fs/promises');
const path = require('path');
const baseDir = path.join(__dirname, 'uploads');

const saveBodyPartImage = (checklistId, bodyPartId, img) => {
    let bodyPartPath = path.join(baseDir, checklistId, bodyPartId);

    mkdir(bodyPartPath, {recursive: true}).then(() => {
        let imagePath = path.join(baseDir, img.name)
        writeFile(imagePath, img).catch(err => {
            console.error(err)
        });
    })

    return bodyPartPath;
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
    return await readFile(filePath, 'utf8')
}

module.exports = {
    saveBodyPartImage,
    deleteBodyPartImage,
    loadBodyPartImage,
    deleteChecklistImages,
}
