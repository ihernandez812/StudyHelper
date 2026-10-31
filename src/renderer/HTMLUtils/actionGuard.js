// Guards for async actions, so a quick second click can't run the work twice.

// Disables the button until work finishes. aria-busy tells screen readers it's working.
// It always comes back enabled, so a button whose enabled state depends on other
// state (practical Start) must recompute it if work changes that state.
const runWithButtonDisabled = async (button, work) => {
    button.disabled = true
    button.setAttribute('aria-busy', 'true')

    try {
        return await work()
    } finally {
        button.disabled = false
        button.removeAttribute('aria-busy')
    }
}

// For actions with no button to disable (Enter key, list rows): a call made
// while the last one is still running is ignored and resolves to null
const preventRepeat = (action) => {
    let isRunning = false

    const guardedAction = async (...argumentList) => {
        if (isRunning) {
            return null
        }

        isRunning = true

        try {
            return await action(...argumentList)
        } finally {
            isRunning = false
        }
    }

    return guardedAction
}

export {
    runWithButtonDisabled,
    preventRepeat,
}
