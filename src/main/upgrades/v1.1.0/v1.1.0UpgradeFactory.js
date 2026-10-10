const { VersionUpgradeFactory } = require('../VersionUpgradeFactory')
const { upgradeVersions } = require('../upgradeVersions')
const { UpgradeTaskCreateSchema } = require('./UpgradeTaskCreateSchema')

class V1_1_0UpgradeFactory extends VersionUpgradeFactory {
    constructor() {
        super(upgradeVersions.V1_1_0, [
            new UpgradeTaskCreateSchema(),
        ])
    }
}

module.exports = { V1_1_0UpgradeFactory }
