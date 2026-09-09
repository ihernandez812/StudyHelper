// router.js — knows nothing about any specific screen
import {renderTopbar} from "./topbar.js";
import {AppState} from "./state.js"

const SCREENS = {}

const registerScreen = (name, config) => { SCREENS[name] = config }

const refreshTopbar = () => {
    const config = SCREENS[AppState.currentPage]
    renderTopbar(config?.topbar, navigate)
}

// ── Navigation ────────────────────────────────────────────────────────────────
const navigate = (screenName) => {
    const config = SCREENS[screenName]

    if (!config) {
        console.error(`Unknown screen: ${screenName}`)
        return
    }

    try {
        SCREENS[AppState.currentPage]?.teardown?.()
    } catch (err) {
        console.error(err)
    }

    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'))
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'))

    document.querySelector(`.nav-item[data-screen="${config.sidebar}"]`)?.classList.add('active')
    document.getElementById(`screen-${screenName}`)?.classList.add('active')

    AppState.currentPage = screenName
    refreshTopbar()

    config.load().catch(error => console.error(error))
}

export {
    navigate,
    renderTopbar,
    registerScreen
}