//SQLite ids are integers, but the renderer keys everything by string: object
//keys and dataset values are always strings. Converting here, at the storage
//boundary, keeps the renderer from ever mixing 1 and '1'.
const toDatabaseId = (rendererId) => {
    if (rendererId === null || rendererId === undefined || rendererId === '') {
        return null
    }

    const databaseId = Number(rendererId)

    if (!Number.isSafeInteger(databaseId)) {
        throw new Error(`Not a valid id: ${rendererId}`)
    }

    return databaseId
}

const toRendererId = (databaseId) => {
    return String(databaseId)
}

//Tags store 'null', '' or nothing when uncategorised
const toCategoryDatabaseId = (rendererCategoryId) => {
    if (rendererCategoryId === 'null') {
        return null
    }

    return toDatabaseId(rendererCategoryId)
}

module.exports = {
    toDatabaseId,
    toRendererId,
    toCategoryDatabaseId,
}
