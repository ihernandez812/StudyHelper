// ── App state ─────────────────────────────────────────────────────────────────
const PAGES ={
    STUDY: 'study',
    LIBRARY: 'library',
    PRACTICAL: 'practical',
    RESULTS: 'results',
    HOME: 'home',
    CHECKLIST_DETAIL: 'checklist-detail',
    BODYPART_EDITOR: 'bodypart-editor',
}

// Single source of truth for cross-screen state. Replaces localStorage hacks.
const AppState = {
    currentChecklistId:   null,
    currentChecklistName: null,
    currentBodyPartId:    null,
    currentBodyPartName:  null,
    currentPage: PAGES.HOME
}

export {
    AppState,
    PAGES,
}