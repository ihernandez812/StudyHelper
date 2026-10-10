const { app } = require('electron')
const { DatabaseSync } = require('node:sqlite')
const path = require('path')

const DATABASE_FILENAME = 'anatome.db'

let anatomeDatabase = null

const getAnatomeDatabase = () => {
    if (anatomeDatabase) {
        return anatomeDatabase
    }

    anatomeDatabase = new DatabaseSync(path.join(app.getPath('userData'), DATABASE_FILENAME))
    anatomeDatabase.exec('PRAGMA journal_mode = WAL')
    anatomeDatabase.exec('PRAGMA foreign_keys = ON')
    return anatomeDatabase
}

//Checkpoints the WAL back into the main file so anatome.db is self-contained
const closeAnatomeDatabase = () => {
    if (!anatomeDatabase) {
        return
    }

    anatomeDatabase.close()
    anatomeDatabase = null
}

//work must be synchronous: an await inside would let COMMIT run before the
//work finished.
const runInTransaction = (work) => {
    const database = getAnatomeDatabase()
    database.exec('BEGIN')

    try {
        const result = work(database)
        database.exec('COMMIT')
        return result
    } catch (error) {
        database.exec('ROLLBACK')
        throw error
    }
}

module.exports = {
    getAnatomeDatabase,
    closeAnatomeDatabase,
    runInTransaction,
}
