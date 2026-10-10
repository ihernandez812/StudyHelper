const { getAnatomeDatabase, runInTransaction } = require('./anatomeDatabase')
const { toDatabaseId, toRendererId, toCategoryDatabaseId } = require('./idConversion')
const FileHelper = require('../FileHelper')

//Saves a finished practical as a snapshot: each station keeps its own copy of
//the body part image and every tag's answer, so later edits or deletes of
//the checklist don't change history. Resolves to the new practical's id.
const addPractical = (practical) => {
    return runInTransaction((anatomeDatabase) => {
        const insertPractical = anatomeDatabase.prepare('INSERT INTO practicals (taken_at) VALUES (?)')
        const insertStation = anatomeDatabase.prepare(`
            INSERT INTO practical_stations
                (practical_id, position, checklist_id, checklist_name, body_part_id, body_part_name, scale, font_size)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)
        const updateStationImage = anatomeDatabase.prepare('UPDATE practical_stations SET image = ? WHERE id = ?')
        const insertAnswer = anatomeDatabase.prepare(`
            INSERT INTO practical_answers (station_id, tag_id, name, x, y, category_id, given, is_correct)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)

        const practicalId = Number(insertPractical.run(Date.now()).lastInsertRowid)

        practical.queue.forEach((station, position) => {
            const bodyPart = station.bodyPart
            const stationId = Number(insertStation.run(
                practicalId,
                position,
                toDatabaseId(station.checklistId),
                station.checklistName ?? null,
                toDatabaseId(bodyPart.id),
                bodyPart.name,
                bodyPart.scale,
                bodyPart.fontSize,
            ).lastInsertRowid)

            for (const [tagId, tag] of Object.entries(bodyPart.coordinates ?? {})) {
                insertAnswer.run(
                    stationId,
                    toDatabaseId(tagId),
                    tag.name,
                    tag.x,
                    tag.y,
                    toCategoryDatabaseId(tag.category),
                    tag.given ?? null,
                    tag.isCorrect ? 1 : 0,
                )
            }

            if (bodyPart.image) {
                const imageKey = FileHelper.copyImage(bodyPart.image, FileHelper.practicalStationImageKey(practicalId, stationId))
                updateStationImage.run(imageKey, stationId)
            }
        })

        return toRendererId(practicalId)
    })
}

//Summaries for lists; use getPracticalById for the stations themselves
const getPracticals = () => {
    const practicalRowList = getAnatomeDatabase().prepare(`
        SELECT practicals.id,
               practicals.taken_at,
               COUNT(DISTINCT practical_stations.id)          AS station_count,
               COUNT(practical_answers.tag_id)                AS total_tags,
               COALESCE(SUM(practical_answers.is_correct), 0) AS num_correct
        FROM practicals
        LEFT JOIN practical_stations ON practical_stations.practical_id = practicals.id
        LEFT JOIN practical_answers ON practical_answers.station_id = practical_stations.id
        GROUP BY practicals.id
        ORDER BY practicals.id
    `).all()
    const practicalMap = {}

    for (const practicalRow of practicalRowList) {
        const practicalId = toRendererId(practicalRow.id)
        practicalMap[practicalId] = {
            id: practicalId,
            takenAt: practicalRow.taken_at,
            stationCount: practicalRow.station_count,
            totalTags: practicalRow.total_tags,
            numCorrect: practicalRow.num_correct,
        }
    }

    return practicalMap
}

const getPracticalById = (rendererPracticalId) => {
    const anatomeDatabase = getAnatomeDatabase()
    const practicalId = toDatabaseId(rendererPracticalId)
    const practicalRow = anatomeDatabase.prepare('SELECT * FROM practicals WHERE id = ?').get(practicalId)

    if (!practicalRow) {
        return {}
    }

    const stationRowList = anatomeDatabase.prepare(
        'SELECT * FROM practical_stations WHERE practical_id = ? ORDER BY position'
    ).all(practicalId)
    const answerRowList = anatomeDatabase.prepare(`
        SELECT practical_answers.* FROM practical_answers
        JOIN practical_stations ON practical_stations.id = practical_answers.station_id
        WHERE practical_stations.practical_id = ?
        ORDER BY practical_answers.rowid
    `).all(practicalId)

    const stationById = new Map()
    let numCorrect = 0

    for (const stationRow of stationRowList) {
        stationById.set(stationRow.id, {
            checklistId: stationRow.checklist_id === null ? undefined : toRendererId(stationRow.checklist_id),
            checklistName: stationRow.checklist_name,
            bodyPart: {
                id: toRendererId(stationRow.body_part_id),
                name: stationRow.body_part_name,
                image: stationRow.image,
                scale: stationRow.scale,
                fontSize: stationRow.font_size,
                coordinates: {},
            },
        })
    }

    for (const answerRow of answerRowList) {
        stationById.get(answerRow.station_id).bodyPart.coordinates[toRendererId(answerRow.tag_id)] = {
            name: answerRow.name,
            x: answerRow.x,
            y: answerRow.y,
            category: answerRow.category_id === null ? undefined : toRendererId(answerRow.category_id),
            given: answerRow.given ?? undefined,
            isCorrect: answerRow.is_correct === 1,
        }
        numCorrect += answerRow.is_correct
    }

    return {
        id: toRendererId(practicalId),
        takenAt: practicalRow.taken_at,
        queue: [...stationById.values()],
        totalTags: answerRowList.length,
        numCorrect: numCorrect,
    }
}

//Stations and answers go with it through ON DELETE CASCADE
const deletePracticalById = async (rendererPracticalId) => {
    const practicalId = toDatabaseId(rendererPracticalId)

    const trashFolder = runInTransaction((anatomeDatabase) => {
        anatomeDatabase.prepare('DELETE FROM practicals WHERE id = ?').run(practicalId)
        //Last, so if the images can't be moved the delete rolls back
        return FileHelper.movePracticalImagesToTrash(practicalId)
    })

    await FileHelper.emptyTrash(trashFolder)
}

module.exports = {
    addPractical,
    getPracticals,
    getPracticalById,
    deletePracticalById,
}
