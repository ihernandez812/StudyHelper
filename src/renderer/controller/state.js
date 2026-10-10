// ── App state ─────────────────────────────────────────────────────────────────
import {PAGES} from "../enums/pages.js"

// Single source of truth for cross-screen state. Replaces localStorage hacks.
const AppState = {
    currentChecklistId:   null,
    currentChecklistName: null,
    currentBodyPartId:    null,
    currentBodyPartName:  null,
    currentPracticalId:   null,
    currentPracticalDate: null,
    currentPage: PAGES.HOME
}

export {
    AppState,
}