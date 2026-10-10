const { getAnatomeDatabase, runInTransaction } = require('./anatomeDatabase')
const { toDatabaseId, toRendererId } = require('./idConversion')
const { loadBodyPartEntryList } = require('./bodyPartStorage')
const FileHelper = require('../FileHelper')

const rowToChecklist = (checklistRow) => {
    return {
        id: toRendererId(checklistRow.id),
        name: checklistRow.name,
        bodyParts: {},
    }
}

const getChecklists = () => {
    const checklistRowList = getAnatomeDatabase().prepare('SELECT * FROM checklists ORDER BY id').all()
    const checklistMap = {}

    for (const checklistRow of checklistRowList) {
        const checklist = rowToChecklist(checklistRow)
        checklistMap[checklist.id] = checklist
    }

    for (const { checklistId, bodyPart } of loadBodyPartEntryList(null)) {
        checklistMap[checklistId].bodyParts[bodyPart.id] = bodyPart
    }

    return checklistMap
}

const getChecklistById = (rendererChecklistId) => {
    const checklistId = toDatabaseId(rendererChecklistId)
    const checklistRow = getAnatomeDatabase().prepare('SELECT * FROM checklists WHERE id = ?').get(checklistId)

    if (!checklistRow) {
        return {}
    }

    const checklist = rowToChecklist(checklistRow)

    for (const { bodyPart } of loadBodyPartEntryList(checklistId)) {
        checklist.bodyParts[bodyPart.id] = bodyPart
    }

    return checklist
}

//Pass null as the id to create one. Only the name is saved; body parts are
//saved through bodyPartStorage. Resolves to the checklist's id.
const addOrEditChecklistById = (rendererChecklistId, checklist) => {
    const anatomeDatabase = getAnatomeDatabase()
    const checklistId = toDatabaseId(rendererChecklistId)

    if (checklistId === null) {
        const insertResult = anatomeDatabase.prepare('INSERT INTO checklists (name) VALUES (?)').run(checklist.name)
        return toRendererId(insertResult.lastInsertRowid)
    }

    anatomeDatabase.prepare('UPDATE checklists SET name = ? WHERE id = ?').run(checklist.name, checklistId)
    return toRendererId(checklistId)
}

//Body parts and tags go with it through ON DELETE CASCADE
const deleteChecklistById = async (rendererChecklistId) => {
    const checklistId = toDatabaseId(rendererChecklistId)

    const trashFolder = runInTransaction((anatomeDatabase) => {
        anatomeDatabase.prepare('DELETE FROM checklists WHERE id = ?').run(checklistId)
        //Last, so if the images can't be moved the delete rolls back
        return FileHelper.moveChecklistImagesToTrash(checklistId)
    })

    await FileHelper.emptyTrash(trashFolder)
}

module.exports = {
    getChecklists,
    getChecklistById,
    addOrEditChecklistById,
    deleteChecklistById,
}
