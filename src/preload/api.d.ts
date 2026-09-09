// Type declarations for the API that preload.js exposes on `window`.
//
// This file is never imported, bundled, or executed — the IDE and any future
// tooling read it, nothing else does. It exists because contextBridge injects
// `window.api` at runtime, so without a declaration every IPC call is untyped
// and mistakes like a forgotten `await` are invisible.
//
// Keep it in step with src/main/preload.js: one entry per exposed method.

// ── Stored data model ─────────────────────────────────────────────────────────

/** A labelled point on a body part image. */
interface Tag {
    name: string
    /** Image-space coordinates, unscaled. Legacy records may hold numeric strings. */
    x: number
    y: number
    /** Category id, or the literal string 'null' when uncategorised. */
    category?: string
    /** Practical only: the answer the user typed at this station. */
    given?: string
    /** Practical only: written by endPractical() when the session is scored. */
    isCorrect?: boolean
}

interface BodyPart {
    id: string
    name: string
    /**
     * An absolute filesystem path once saved. A `data:` URL only while a newly
     * dropped image is in flight to addOrEditBodyPartById.
     */
    image: string
    coordinates: Record<string, Tag>
    scale: number
    /** Legacy records may hold a numeric string. */
    fontSize: number
}

interface Checklist {
    id: string
    name: string
    bodyParts: Record<string, BodyPart>
}

interface Category {
    id: string
    name: string
}

/** One station in a practical: a snapshot of a body part at the time it was taken. */
interface PracticalStation {
    checklistId: string
    bodyPart: BodyPart
}

interface Practical {
    id: string
    /** Preformatted for display, e.g. "June 24, 2026 at 2:34 PM". Not sortable. */
    date: string
    queue: PracticalStation[]
    totalTags: number
    numCorrect: number
}

interface SearchResults {
    checklists: Record<string, string>
    bodyParts: Record<string, string>
    bodyTags: Record<string, string>
}

/** Electron's MessageBoxReturnValue, narrowed to what this app reads. */
interface DialogResult {
    /** Index of the button clicked. The Yes/No dialogs treat 0 as Yes. */
    response: number
    checkboxChecked: boolean
}

// ── The bridge ────────────────────────────────────────────────────────────────

interface StudyHelperApi {
    // Dialogs
    /** Shows an OK message box. Resolves once dismissed; carries no value. */
    popup(message: string): Promise<void>
    /**
     * Shows a Yes/No message box. Resolves to undefined if showMessageBox
     * rejects — the handler swallows the error — so check `result` before use.
     */
    dialogQuestion(message: string): Promise<DialogResult | undefined>

    // Checklists
    getChecklists(): Promise<Record<string, Checklist>>
    getChecklistById(id: string): Promise<Checklist>
    /**
     * Pass null as id to create. NOTE: returns void, not the new id — the
     * handler drops the key that storageUtils generates, unlike
     * addOrEditCategoryById. Worth making consistent.
     */
    addOrEditChecklistById(id: string | null, checklist: Partial<Checklist>): Promise<void>
    deleteChecklistById(id: string): Promise<void>

    // Body parts
    getBodyPartById(bodyPartId: string, checklistId: string): Promise<BodyPart>
    /** Resolves to the body part's id. */
    addOrEditBodyPartById(
        bodyPartId: string,
        checklistId: string,
        bodyPart: Partial<BodyPart>,
    ): Promise<string>
    removeBodyPart(bodyPartId: string, checklistId: string): Promise<void>

    // Categories
    getCategories(): Promise<Record<string, Category>>
    getCategoryById(id: string): Promise<Category>
    /** Pass null as id to create. Resolves to the category's id. */
    addOrEditCategoryById(id: string | null, category: Partial<Category>): Promise<string>
    removeCategory(id: string): Promise<void>

    // Practicals
    addPractical(id: string, practical: Omit<Practical, 'id'>): Promise<string>
    /** Undefined when no practical has ever been saved — callers use `|| {}`. */
    getPracticals(): Promise<Record<string, Practical> | undefined>
    getPracticalById(id: string): Promise<Practical>
    deletePracticalById(id: string): Promise<void>

    // Misc
    reloadHome(): Promise<void>
    search(
        isChecklistFilterChecked: boolean,
        isBodyPartFilterChecked: boolean,
        isBodyTagFilterChecked: boolean,
        searchQuery: string,
    ): Promise<SearchResults>
    getDarkMode(): Promise<boolean>
    /**
     * Subscribes to menu-driven theme changes. Returns nothing, so there is no
     * way to unsubscribe; see the note in preload.js.
     */
    onDarkModeChanged(callback: (isDark: boolean) => void): void
}

interface Window {
    api: StudyHelperApi
}
