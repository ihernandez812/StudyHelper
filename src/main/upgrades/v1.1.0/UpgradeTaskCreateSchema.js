const { UpgradeTask } = require('../UpgradeTask')
const { runInTransaction } = require('../../storage/anatomeDatabase')

class UpgradeTaskCreateSchema extends UpgradeTask {
    async upgrade() {
        runInTransaction((anatomeDatabase) => anatomeDatabase.exec(`
            CREATE TABLE IF NOT EXISTS categories (
                id   INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS checklists (
                id   INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS body_parts (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                checklist_id INTEGER NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
                name         TEXT NOT NULL,
                image        TEXT,
                scale        REAL NOT NULL DEFAULT 1,
                font_size    INTEGER NOT NULL DEFAULT 16
            );
            CREATE INDEX IF NOT EXISTS body_parts_checklist_id ON body_parts(checklist_id);

            CREATE TABLE IF NOT EXISTS tags (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                body_part_id INTEGER NOT NULL REFERENCES body_parts(id) ON DELETE CASCADE,
                name         TEXT NOT NULL,
                x            REAL NOT NULL,
                y            REAL NOT NULL,
                category_id  INTEGER REFERENCES categories(id) ON DELETE SET NULL
            );
            CREATE INDEX IF NOT EXISTS tags_body_part_id ON tags(body_part_id);
            CREATE INDEX IF NOT EXISTS tags_category_id ON tags(category_id);

            -- Practicals are snapshots. The *_id columns point at the live
            -- checklist/body part/tag they were taken from but are deliberately
            -- not foreign keys: history must survive the source being edited
            -- or deleted, and those ids are what metrics group by.
            CREATE TABLE IF NOT EXISTS practicals (
                id       INTEGER PRIMARY KEY AUTOINCREMENT,
                taken_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS practical_stations (
                id             INTEGER PRIMARY KEY AUTOINCREMENT,
                practical_id   INTEGER NOT NULL REFERENCES practicals(id) ON DELETE CASCADE,
                position       INTEGER NOT NULL,
                checklist_id   INTEGER,
                checklist_name TEXT,
                body_part_id   INTEGER NOT NULL,
                body_part_name TEXT NOT NULL,
                image          TEXT,
                scale          REAL NOT NULL DEFAULT 1,
                font_size      INTEGER NOT NULL DEFAULT 16,
                UNIQUE (practical_id, position)
            );
            CREATE INDEX IF NOT EXISTS practical_stations_body_part_id ON practical_stations(body_part_id);

            CREATE TABLE IF NOT EXISTS practical_answers (
                station_id  INTEGER NOT NULL REFERENCES practical_stations(id) ON DELETE CASCADE,
                tag_id      INTEGER NOT NULL,
                name        TEXT NOT NULL,
                x           REAL NOT NULL,
                y           REAL NOT NULL,
                category_id INTEGER,
                given       TEXT,
                is_correct  INTEGER NOT NULL,
                PRIMARY KEY (station_id, tag_id)
            );
            CREATE INDEX IF NOT EXISTS practical_answers_tag_id ON practical_answers(tag_id);
        `))
    }
}

module.exports = { UpgradeTaskCreateSchema }
