const HOME_TEMPLATES = {
    checklistRow: document.getElementById('tpl-home-checklist-row'),
}

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

// ── Topbar config per screen ──────────────────────────────────────────────────
// Describes what the topbar contains; setTopbar() turns it into DOM.
//
// `title` is a plain string because it never changes. `breadcrumb` and
// `actions` are functions for two reasons: they read AppState, which is only
// correct at render time, and they reference handlers defined in controllers
// that load after this file. Evaluating either eagerly would blow up.
//
// A breadcrumb segment with a `screen` renders as a link to it; the last
// segment normally has none and renders as plain current-page text.
const TOPBAR = {
    home: {
        title: 'Home',
    },
    library: {
        title: 'Library',
        actions: () => [
            { label: 'Categories',    icon: 'fa-tags', className: 'btn-ghost',   onClick: openCategoriesModal },
            { label: 'New checklist', icon: 'fa-plus', className: 'btn-primary', onClick: openNewChecklistModal },
        ],
    },
    'checklist-detail': {
        breadcrumb: () => [
            { label: 'Library', screen: 'library' },
            { label: window.AppState.currentChecklistName || '' },
        ],
        actions: () => [
            { label: 'Study this',    icon: 'fa-book-open', className: 'btn-secondary', onClick: () => navigate('study') },
            { label: 'Add body part', icon: 'fa-plus',      className: 'btn-primary',   onClick: () => openBodyPartEditor(null) },
        ],
    },
    'bodypart-editor': {
        breadcrumb: () => [
            { label: 'Library', screen: 'library' },
            { label: window.AppState.currentChecklistName || '', screen: 'checklist-detail' },
            { label: window.AppState.currentBodyPartName || 'New body part' },
        ],
    },
    study: {
        title: 'Study',
    },
    practical: {
        title: 'Practical',
    },
    results: {
        title: 'Results',
    },
}

// ── Screen registry ───────────────────────────────────────────────────────────
// One entry per screen: which sidebar item highlights it (sub-screens point at
// their parent), what runs on entry, and what to clean up on exit.
//
// `load` and `teardown` are thunks for the same reason TOPBAR's are: they name
// functions defined in controllers that parse after this file, so the reference
// has to resolve at call time rather than at definition time.
const SCREENS = {
    'home':             { sidebar: 'home',      load: () => loadHomeScreen() },
    'library':          { sidebar: 'library',   load: () => loadLibraryScreen() },
    'checklist-detail': { sidebar: 'library',   load: () => loadChecklistDetail() },
    'bodypart-editor':  { sidebar: 'library',   load: () => initBodyPartEditor() },
    'study':            { sidebar: 'study',     load: () => loadStudyPicker() },
    'practical':        { sidebar: 'practical', load: () => loadPracticalSetup(),
                                                teardown: () => stopPracticalTimer() },
    'results':          { sidebar: 'results',   load: () => loadResultsScreen() },
}

// ── Navigation ────────────────────────────────────────────────────────────────

const navigate = (screenName) => {
    const config = SCREENS[screenName]

    if (!config) {
        console.error(`Unknown screen: ${screenName}`)
        return
    }

    SCREENS[window.AppState.currentPage]?.teardown?.()

    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'))
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'))

    document.querySelector(`.nav-item[data-screen="${config.sidebar}"]`)?.classList.add('active')
    document.getElementById(`screen-${screenName}`)?.classList.add('active')

    setTopbar(screenName)
    window.AppState.currentPage = screenName

    config.load().catch(error => console.error(error))
}

const buildIcon = (iconClass) => {
    const icon = document.createElement('i')
    icon.className = `fas ${iconClass}`
    return icon
}

const buildTopbarTitle = (text) => {
    const heading = document.createElement('h2')
    heading.textContent = text
    return heading
}

const buildBreadcrumb = (segments) => {
    const nav = document.createElement('nav')
    nav.className = 'breadcrumb'

    segments.forEach((segment, index) => {
        if (index > 0) {
            const separator = document.createElement('span')
            separator.className = 'breadcrumb-sep'
            separator.appendChild(buildIcon('fa-chevron-right'))
            nav.appendChild(separator)
        }

        if (segment.screen) {
            const link = document.createElement('a')
            link.className   = 'breadcrumb-link'
            link.textContent = segment.label
            link.addEventListener('click', () => navigate(segment.screen))
            nav.appendChild(link)
        } else {
            const current = document.createElement('span')
            current.className   = 'breadcrumb-current'
            current.textContent = segment.label
            nav.appendChild(current)
        }
    })

    return nav
}

const buildTopbarButton = ({ label, icon, className, onClick }) => {
    const button = document.createElement('button')
    button.className = `btn ${className}`

    if (icon) {
        button.appendChild(buildIcon(icon))
        button.append(' ')
    }

    //append() takes a string and inserts it as text, so the label is never parsed as markup
    button.append(label)
    button.addEventListener('click', onClick)

    return button
}

const setTopbar = (screenName) => {
    const left  = document.getElementById('topbar-left')
    const right = document.getElementById('topbar-right')

    //replaceChildren() with no arguments empties an element
    left.replaceChildren()
    right.replaceChildren()

    const config = TOPBAR[screenName]

    if (!config) {
        return
    }

    if (config.breadcrumb) {
        left.appendChild(buildBreadcrumb(config.breadcrumb()))
    } else if (config.title) {
        left.appendChild(buildTopbarTitle(config.title))
    }

    if (config.actions) {
        config.actions().forEach(action => right.appendChild(buildTopbarButton(action)))
    }
}

document.getElementById('home-add-checklist-btn').addEventListener('click', () => {
    navigate('library')
})

// ── Home screen ───────────────────────────────────────────────────────────────

const loadHomeScreen = async () => {
    const checklists = await window.api.getChecklists()
    const practicals = await window.api.getPracticals() || {}

    const checklistKeys = Object.keys(checklists)
    let totalBodyParts  = 0

    for (const id of checklistKeys) {
        totalBodyParts += Object.keys(checklists[id]['bodyParts'] || {}).length
    }

    document.getElementById('stat-checklists').textContent = checklistKeys.length.toString()
    document.getElementById('stat-bodyparts').textContent  = totalBodyParts.toString()
    document.getElementById('stat-practicals').textContent = Object.keys(practicals).length.toString()

    const list       = document.getElementById('home-checklist-list')
    const emptyState = document.getElementById('home-empty')

    // Clear previous rows (keep empty state element)
    Array.from(list.children).forEach(c => { if (c.id !== 'home-empty') c.remove() })

    if (checklistKeys.length === 0) {
        emptyState.classList.remove('hide')
        return
    }

    emptyState.classList.add('hide')

    checklistKeys.forEach(id => {
        const checklist = checklists[id]
        const partCount = Object.keys(checklist['bodyParts'] || {}).length
        list.appendChild(createHomeChecklistRow(id, checklist['name'], partCount))
    })
}

const createHomeChecklistRow = (id, name, partCount) => {
    const row = cloneTemplate(HOME_TEMPLATES.checklistRow)

    row.dataset.id   = id
    row.dataset.name = name
    row.querySelector('.js-name').textContent = name
    row.querySelector('.js-meta').textContent = `${partCount} body part${partCount !== 1 ? 's' : ''}`

    row.querySelector('[data-action="study"]').addEventListener('click', () => {
        window.AppState.currentChecklistId   = id
        window.AppState.currentChecklistName = name
        navigate('study')
    })

    return row
}

// ── Dark mode ─────────────────────────────────────────────────────────────────

const applyTheme = (isDark) => {
    document.documentElement.setAttribute('data-bs-theme', isDark ? 'dark' : 'light')
    const icon = document.querySelector('.sidebar-icon')
    if (icon) icon.src = isDark ? '../images/AnatoMeIconDark.png' : '../images/AnatoMeIcon.png'
}

window.addEventListener('load', async () => {
    // Restore saved preference before first paint
    const savedDark = await window.api.getDarkMode()
    applyTheme(savedDark)

    // Listen for menu-triggered toggles
    window.api.onDarkModeChanged((isDark) => applyTheme(isDark))

    navigate('home')
})
