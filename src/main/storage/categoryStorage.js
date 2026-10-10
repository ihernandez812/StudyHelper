const { getAnatomeDatabase } = require('./anatomeDatabase')
const { toDatabaseId, toRendererId } = require('./idConversion')

const rowToCategory = (categoryRow) => {
    return {
        id: toRendererId(categoryRow.id),
        name: categoryRow.name,
    }
}

const getCategories = () => {
    const categoryRowList = getAnatomeDatabase().prepare('SELECT * FROM categories ORDER BY id').all()
    const categoryMap = {}

    for (const categoryRow of categoryRowList) {
        const category = rowToCategory(categoryRow)
        categoryMap[category.id] = category
    }

    return categoryMap
}

const getCategoryById = (rendererCategoryId) => {
    const categoryRow = getAnatomeDatabase().prepare('SELECT * FROM categories WHERE id = ?').get(toDatabaseId(rendererCategoryId))

    if (!categoryRow) {
        return {}
    }

    return rowToCategory(categoryRow)
}

//Pass null as the id to create one. Resolves to the category's id.
const addOrEditCategoryById = (rendererCategoryId, category) => {
    const anatomeDatabase = getAnatomeDatabase()
    const categoryId = toDatabaseId(rendererCategoryId)

    if (categoryId === null) {
        const insertResult = anatomeDatabase.prepare('INSERT INTO categories (name) VALUES (?)').run(category.name)
        return toRendererId(insertResult.lastInsertRowid)
    }

    anatomeDatabase.prepare('UPDATE categories SET name = ? WHERE id = ?').run(category.name, categoryId)
    return toRendererId(categoryId)
}

//Tags using it are cleared by ON DELETE SET NULL
const removeCategory = (rendererCategoryId) => {
    getAnatomeDatabase().prepare('DELETE FROM categories WHERE id = ?').run(toDatabaseId(rendererCategoryId))
}

module.exports = {
    getCategories,
    getCategoryById,
    addOrEditCategoryById,
    removeCategory,
}
