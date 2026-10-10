const { getAnatomeDatabase, runInTransaction } = require('./anatomeDatabase')
const { toDatabaseId, toRendererId, toCategoryDatabaseId } = require('./idConversion')
const FileHelper = require('../FileHelper')

const rowToTag = (tagRow) => {
    return {
        name: tagRow.name,
        x: tagRow.x,
        y: tagRow.y,
        category: tagRow.category_id === null ? undefined : toRendererId(tagRow.category_id),
    }
}

const rowToBodyPart = (bodyPartRow) => {
    return {
        id: toRendererId(bodyPartRow.id),
        name: bodyPartRow.name,
        image: bodyPartRow.image,
        scale: bodyPartRow.scale,
        fontSize: bodyPartRow.font_size,
        coordinates: {},
    }
}

//Loads body parts with their tags in two queries. Pass a checklist id to
//limit it to that checklist, or null for every checklist. Each entry keeps
//its checklist id so callers can group them.
const loadBodyPartEntryList = (checklistDatabaseId) => {
    const anatomeDatabase = getAnatomeDatabase()
    const isAllChecklists = checklistDatabaseId === null
    const bodyPartRowList = isAllChecklists
        ? anatomeDatabase.prepare('SELECT * FROM body_parts ORDER BY id').all()
        : anatomeDatabase.prepare('SELECT * FROM body_parts WHERE checklist_id = ? ORDER BY id').all(checklistDatabaseId)
    const tagRowList = isAllChecklists
        ? anatomeDatabase.prepare('SELECT * FROM tags ORDER BY id').all()
        : anatomeDatabase.prepare(`
            SELECT tags.* FROM tags
            JOIN body_parts ON body_parts.id = tags.body_part_id
            WHERE body_parts.checklist_id = ?
            ORDER BY tags.id
        `).all(checklistDatabaseId)

    const bodyPartEntryById = new Map()

    for (const bodyPartRow of bodyPartRowList) {
        bodyPartEntryById.set(bodyPartRow.id, {
            checklistId: toRendererId(bodyPartRow.checklist_id),
            bodyPart: rowToBodyPart(bodyPartRow),
        })
    }

    for (const tagRow of tagRowList) {
        bodyPartEntryById.get(tagRow.body_part_id).bodyPart.coordinates[toRendererId(tagRow.id)] = rowToTag(tagRow)
    }

    return [...bodyPartEntryById.values()]
}

const getBodyPartById = (rendererBodyPartId) => {
    const anatomeDatabase = getAnatomeDatabase()
    const bodyPartId = toDatabaseId(rendererBodyPartId)
    const bodyPartRow = anatomeDatabase.prepare('SELECT * FROM body_parts WHERE id = ?').get(bodyPartId)

    if (!bodyPartRow) {
        return {}
    }

    const bodyPart = rowToBodyPart(bodyPartRow)
    const tagRowList = anatomeDatabase.prepare('SELECT * FROM tags WHERE body_part_id = ? ORDER BY id').all(bodyPartId)

    for (const tagRow of tagRowList) {
        bodyPart.coordinates[toRendererId(tagRow.id)] = rowToTag(tagRow)
    }

    return bodyPart
}

//Keys that match an existing tag of this body part are updated; any other key
//(the editor uses temporary ones like 'new-1') is inserted; existing tags
//missing from the map are deleted.
const saveTagMap = (anatomeDatabase, bodyPartId, tagMap) => {
    const remainingTagIdSet = new Set(
        anatomeDatabase.prepare('SELECT id FROM tags WHERE body_part_id = ?').all(bodyPartId)
            .map(tagRow => toRendererId(tagRow.id))
    )
    const insertTag = anatomeDatabase.prepare('INSERT INTO tags (body_part_id, name, x, y, category_id) VALUES (?, ?, ?, ?, ?)')
    const updateTag = anatomeDatabase.prepare('UPDATE tags SET name = ?, x = ?, y = ?, category_id = ? WHERE id = ?')
    const deleteTag = anatomeDatabase.prepare('DELETE FROM tags WHERE id = ?')

    for (const [tagKey, tag] of Object.entries(tagMap)) {
        const categoryId = toCategoryDatabaseId(tag.category)

        if (remainingTagIdSet.has(tagKey)) {
            updateTag.run(tag.name, tag.x, tag.y, categoryId, toDatabaseId(tagKey))
            remainingTagIdSet.delete(tagKey)
        } else {
            insertTag.run(bodyPartId, tag.name, tag.x, tag.y, categoryId)
        }
    }

    for (const removedTagId of remainingTagIdSet) {
        deleteTag.run(toDatabaseId(removedTagId))
    }
}

//Pass null as the body part id to create one. Resolves to the body part's id.
//When bodyPart.image isn't a new data URL the stored image is kept.
const addOrEditBodyPartById = (rendererBodyPartId, rendererChecklistId, bodyPart) => {
    return runInTransaction((anatomeDatabase) => {
        const checklistId = toDatabaseId(rendererChecklistId)
        let bodyPartId = toDatabaseId(rendererBodyPartId)

        if (bodyPartId === null) {
            const insertResult = anatomeDatabase.prepare(
                'INSERT INTO body_parts (checklist_id, name, scale, font_size) VALUES (?, ?, ?, ?)'
            ).run(checklistId, bodyPart.name, bodyPart.scale, bodyPart.fontSize)
            bodyPartId = Number(insertResult.lastInsertRowid)
        } else {
            anatomeDatabase.prepare(
                'UPDATE body_parts SET name = ?, scale = ?, font_size = ? WHERE id = ?'
            ).run(bodyPart.name, bodyPart.scale, bodyPart.fontSize, bodyPartId)
        }

        saveTagMap(anatomeDatabase, bodyPartId, bodyPart.coordinates ?? {})

        //Last, so the only thing that can fail after the file is written is COMMIT
        if (FileHelper.isImageDataUrl(bodyPart.image)) {
            const imageKey = FileHelper.saveImage(FileHelper.bodyPartImageKey(checklistId, bodyPartId), bodyPart.image)
            anatomeDatabase.prepare('UPDATE body_parts SET image = ? WHERE id = ?').run(imageKey, bodyPartId)
        }

        return toRendererId(bodyPartId)
    })
}

//Tags go with it through ON DELETE CASCADE
const removeBodyPart = async (rendererBodyPartId) => {
    const bodyPartId = toDatabaseId(rendererBodyPartId)

    const trashFolder = runInTransaction((anatomeDatabase) => {
        const bodyPartRow = anatomeDatabase.prepare('SELECT checklist_id FROM body_parts WHERE id = ?').get(bodyPartId)

        if (!bodyPartRow) {
            return null
        }

        anatomeDatabase.prepare('DELETE FROM body_parts WHERE id = ?').run(bodyPartId)
        //Last, so if the images can't be moved the delete rolls back
        return FileHelper.moveBodyPartImagesToTrash(bodyPartRow.checklist_id, bodyPartId)
    })

    await FileHelper.emptyTrash(trashFolder)
}

module.exports = {
    loadBodyPartEntryList,
    getBodyPartById,
    addOrEditBodyPartById,
    removeBodyPart,
}
