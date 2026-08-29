// router.js — knows nothing about any specific screen
import {renderTopbar} from "./topbar.js";

const SCREENS = {}

export const registerScreen = (name, config) => { SCREENS[name] = config }

export const refreshTopbar = () => {
    const config = SCREENS[window.AppState.currentPage]
    renderTopbar(config?.topbar, navigate)
}

// ── Navigation ────────────────────────────────────────────────────────────────
export const navigate = (screenName) => {
    const config = SCREENS[screenName]

    if (!config) {
        console.error(`Unknown screen: ${screenName}`)
        return
    }

    try {
        SCREENS[window.AppState.currentPage]?.teardown?.()
    } catch (err) {
        console.error(err)
    }

    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'))
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'))

    document.querySelector(`.nav-item[data-screen="${config.sidebar}"]`)?.classList.add('active')
    document.getElementById(`screen-${screenName}`)?.classList.add('active')

    window.AppState.currentPage = screenName
    refreshTopbar()

    config.load().catch(error => console.error(error))
}

