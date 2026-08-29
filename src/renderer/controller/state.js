// ── App state ─────────────────────────────────────────────────────────────────
// Single source of truth for cross-screen state. Replaces localStorage hacks.
window.AppState = {
    currentChecklistId:   null,
    currentChecklistName: null,
    currentBodyPartId:    null,
    currentBodyPartName:  null,
    currentBodyPartIds:   [],   // used in study mode for multi-body-part sessions
    currentPage: 'home'
}