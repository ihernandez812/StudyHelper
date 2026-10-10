const { app } = require('electron')
const log = require('electron-log/main')
const { settingKeys, ensureSettingsTable, getSetting, setSetting } = require('../storage/settingsStorage')
const { upgradeVersions } = require('./upgradeVersions')
const { V1_1_0UpgradeFactory } = require('./v1.1.0/v1.1.0UpgradeFactory')

//Oldest first. Add one entry per release that has upgrade tasks.
const VERSION_UPGRADE_FACTORY_LIST = [
    new V1_1_0UpgradeFactory(),
]

//Returns <0, 0 or >0 like a sort comparator. Plain major.minor.patch only.
const compareVersions = (firstVersion, secondVersion) => {
    const firstVersionPartList = firstVersion.split('.').map(Number)
    const secondVersionPartList = secondVersion.split('.').map(Number)

    for (let index = 0; index < 3; index++) {
        if (firstVersionPartList[index] !== secondVersionPartList[index]) {
            return firstVersionPartList[index] - secondVersionPartList[index]
        }
    }

    return 0
}

//Runs every version factory from lastVersion (inclusive, so the last one
//reruns) up to the running app version. Throws if any task fails, leaving
//lastVersion at the last version that fully succeeded.
const runUpgrades = async () => {
    ensureSettingsTable()

    const lastVersion = getSetting(settingKeys.LAST_VERSION, upgradeVersions.NO_VERSION)
    const appVersion = app.getVersion()
    const pendingFactoryList = VERSION_UPGRADE_FACTORY_LIST.filter(factory =>
        compareVersions(factory.version, lastVersion) >= 0 &&
        compareVersions(factory.version, appVersion) <= 0
    )
    const pendingVersionText = pendingFactoryList.map(factory => factory.version).join(', ') || 'none'

    log.info(`Upgrades: last ${lastVersion}, app ${appVersion}, running ${pendingVersionText}`)

    for (const factory of pendingFactoryList) {
        await factory.upgrade()
        setSetting(settingKeys.LAST_VERSION, factory.version)
    }
}

module.exports = {
    runUpgrades,
}
