const log = require('electron-log/main')

class VersionUpgradeFactory {
    constructor(version, upgradeTaskList) {
        this.version = version
        this.upgradeTaskList = upgradeTaskList
    }

    async upgrade() {
        for (const upgradeTask of this.upgradeTaskList) {
            log.info(`Upgrade ${this.version}: running ${upgradeTask.name}`)
            await upgradeTask.upgrade()
        }
    }
}

module.exports = { VersionUpgradeFactory }
