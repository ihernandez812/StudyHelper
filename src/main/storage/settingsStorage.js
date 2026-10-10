const { getAnatomeDatabase } = require('./anatomeDatabase')

const settingKeys = {
    LAST_VERSION: 'lastVersion',
    IS_DARK_MODE: 'isDarkMode',
}

//Created here rather than in UpgradeTaskCreateSchema because the upgrade
//factory reads lastVersion before any upgrade task has run.
const ensureSettingsTable = () => {
    getAnatomeDatabase().exec('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)')
}

//Values are stored as JSON so booleans and numbers come back with their type
const getSetting = (key, defaultValue) => {
    const row = getAnatomeDatabase().prepare('SELECT value FROM settings WHERE key = ?').get(key)

    if (!row) {
        return defaultValue
    }

    return JSON.parse(row.value)
}

const setSetting = (key, value) => {
    getAnatomeDatabase().prepare(`
        INSERT INTO settings (key, value) VALUES (?, ?)
        ON CONFLICT (key) DO UPDATE SET value = excluded.value
    `).run(key, JSON.stringify(value))
}

module.exports = {
    settingKeys,
    ensureSettingsTable,
    getSetting,
    setSetting,
}
