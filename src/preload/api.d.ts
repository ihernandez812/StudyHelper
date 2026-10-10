// Type declarations for the API that preload.js exposes on `window`.
//
// This file is never imported, bundled, or executed — the IDE and any future
// tooling read it, nothing else does. It exists because contextBridge injects
// `window.api` at runtime, so without a declaration every IPC call is untyped
// and mistakes like a forgotten `await` are invisible.
//
// Keep it in step with src/main/preload.js: one entry per exposed method.

// ── Stored data model ─────────────────────────────────────────────────────────
//
// Every id is created by the database. They are integers there but always
// reach the renderer as numeric strings, e.g. "12", so they work as object
// keys and dataset values without mixing 1 and '1'.

/**
 * A labelled point on a body part image. Keyed by tag id in `coordinates`;
 * the editor uses temporary keys like "new-1" for tags not yet saved.
 */
interface Tag {
    name: string
    /** Image-space coordinates, unscaled. */
    x: number
    y: number
    /** Category id; undefined when uncategorised. */
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
     * An image key like "checklists/1/4/image.png" once saved; see
     * createImageUrl. A `data:` URL only while a newly dropped image is in
     * flight to addOrEditBodyPartById.
     */
    image: string
    coordinates: Record<string, Tag>
    scale: number
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
    /** Saved tags using this category. Only set by getCategories. */
    tagCount?: number
}

/** One station in a practical: a snapshot of a body part at the time it was taken. */
interface PracticalStation {
    /** The checklist it was taken from, which may since have been deleted. */
    checklistId: string
    /** Name at the time the practical was taken. */
    checklistName: string
    bodyPart: BodyPart
}

/** What getPracticals returns for each practical: enough for a list row. */
interface PracticalSummary {
    id: string
    /** Milliseconds since the epoch. Format with formatPracticalDate. */
    takenAt: number
    stationCount: number
    totalTags: number
    numCorrect: number
}

interface Practical {
    id: string
    /** Milliseconds since the epoch. Format with formatPracticalDate. */
    takenAt: number
    queue: PracticalStation[]
    totalTags: number
    numCorrect: number
}

/** What the practical screen hands to addPractical. */
interface NewPractical {
    /** Each tag must already carry given and isCorrect. */
    queue: PracticalStation[]
}

/** Electron's MessageBoxReturnValue, narrowed to what this app reads. */
interface DialogResult {
    /** Index of the button clicked. The Yes/No dialogs treat 0 as Yes. */
    response: number
    checkboxChecked: boolean
}

// ── The bridge ────────────────────────────────────────────────────────────────

interface AnatoMeApi {
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
    /** Pass null as id to create. Only the name is saved. Resolves to the checklist's id. */
    addOrEditChecklistById(id: string | null, checklist: Pick<Checklist, 'name'>): Promise<string>
    deleteChecklistById(id: string): Promise<void>

    // Body parts
    getBodyPartById(bodyPartId: string): Promise<BodyPart>
    /** Pass null as bodyPartId to create. Resolves to the body part's id. */
    addOrEditBodyPartById(
        bodyPartId: string | null,
        checklistId: string,
        bodyPart: Partial<BodyPart>,
    ): Promise<string>
    removeBodyPart(bodyPartId: string): Promise<void>

    // Categories
    getCategories(): Promise<Record<string, Category>>
    getCategoryById(id: string): Promise<Category>
    /** Pass null as id to create. Resolves to the category's id. */
    addOrEditCategoryById(id: string | null, category: Partial<Category>): Promise<string>
    removeCategory(id: string): Promise<void>

    // Practicals
    /** Resolves to the new practical's id. */
    addPractical(practical: NewPractical): Promise<string>
    getPracticals(): Promise<Record<string, PracticalSummary>>
    getPracticalById(id: string): Promise<Practical>
    deletePracticalById(id: string): Promise<void>

    // Misc
    reloadHome(): Promise<void>
    getDarkMode(): Promise<boolean>
    /**
     * Subscribes to menu-driven theme changes. Returns nothing, so there is no
     * way to unsubscribe; see the note in preload.js.
     */
    onDarkModeChanged(callback: (isDark: boolean) => void): void
}

interface Window {
    api: AnatoMeApi
}
