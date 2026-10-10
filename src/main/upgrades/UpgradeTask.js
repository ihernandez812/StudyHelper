//Every upgrade task extends this and overrides upgrade(). Tasks must be
//idempotent: the factory reruns the last applied version on every launch.
class UpgradeTask {
    get name() {
        return this.constructor.name
    }

    async upgrade() {
        throw new Error(`${this.name} does not implement upgrade()`)
    }
}

module.exports = { UpgradeTask }
