// ── App state ─────────────────────────────────────────────────────────────────
// Single source of truth for cross-screen state. Replaces localStorage hacks.
window.AppState = {
    currentChecklistId:   null,
    currentChecklistName: null,
    currentBodyPartId:    null,
    currentBodyPartName:  null,
    currentBodyPartIds:   [],   // used in study mode for multi-body-part sessions
}

// ── Topbar config per screen ──────────────────────────────────────────────────
// Each entry defines the title/breadcrumb and optional action buttons.
// Screens can override this by calling setTopbar() directly.
const TOPBAR = {
    home: {
        left: () => '<h2>Home</h2>',
        right: () => ''
    },
    library: {
        left: () => '<h2>Library</h2>',
        right: () => `
            <button class="btn btn-ghost" onclick="openCategoriesModal()">
                <i class="fas fa-tags"></i> Categories
            </button>
            <button class="btn btn-primary" onclick="openNewChecklistModal()">
                <i class="fas fa-plus"></i> New checklist
            </button>`
    },
    'checklist-detail': {
        left: () => `
            <nav class="breadcrumb">
                <a class="breadcrumb-link" onclick="navigate('library')">Library</a>
                <span class="breadcrumb-sep"><i class="fas fa-chevron-right"></i></span>
                <span class="breadcrumb-current">${window.AppState.currentChecklistName || ''}</span>
            </nav>`,
        right: () => `
            <button class="btn btn-secondary" onclick="navigateToStudyFromChecklist()">
                <i class="fas fa-book-open"></i> Study this
            </button>
            <button class="btn btn-primary" onclick="openBodyPartEditor(null)">
                <i class="fas fa-plus"></i> Add body part
            </button>`
    },
    'bodypart-editor': {
        left: () => `
            <nav class="breadcrumb">
                <a class="breadcrumb-link" onclick="navigate('library')">Library</a>
                <span class="breadcrumb-sep"><i class="fas fa-chevron-right"></i></span>
                <a class="breadcrumb-link" onclick="navigate('checklist-detail')">${window.AppState.currentChecklistName || ''}</a>
                <span class="breadcrumb-sep"><i class="fas fa-chevron-right"></i></span>
                <span class="breadcrumb-current">${window.AppState.currentBodyPartName || 'New body part'}</span>
            </nav>`,
        right: () => ''
    },
    study: {
        left: () => '<h2>Study</h2>',
        right: () => ''
    },
    practical: {
        left: () => '<h2>Practical</h2>',
        right: () => ''
    },
    results: {
        left: () => '<h2>Results</h2>',
        right: () => ''
    },
}

// ── Navigation ────────────────────────────────────────────────────────────────

const navigate = (screenName) => {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'))

    // Sidebar highlight — map sub-screens to their parent sidebar item
    const sidebarMap = {
        'home':             'home',
        'library':          'library',
        'checklist-detail': 'library',
        'bodypart-editor':  'library',
        'study':            'study',
        'practical':        'practical',
        'results':          'results',
    }
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'))
    const sidebarKey = sidebarMap[screenName] || screenName
    const navItem = document.querySelector(`.nav-item[data-screen="${sidebarKey}"]`)
    if (navItem) navItem.classList.add('active')

    const screen = document.getElementById(`screen-${screenName}`)
    if (screen) screen.classList.add('active')

    // Update topbar
    const config = TOPBAR[screenName]
    if (config) setTopbar(config.left(), config.right())

    // Fire screen-specific init
    if (screenName === 'home') {
        loadHomeScreen().catch(error => console.log(error))
    }

    if (screenName === 'library') {
        loadLibraryScreen().catch(error => console.log(error))
    }

    if (screenName === 'checklist-detail') {
        loadChecklistDetail().catch(error => console.log(error))
    }

    if (screenName === 'bodypart-editor') {
        initBodyPartEditor().catch(error => console.log(error))
    }

    if (screenName === 'study'){
        loadStudyPicker().catch(error => console.log(error))
    }

    if (screenName === 'practical') {
        loadPracticalSetup().catch(error => console.log(error))
    }

    if (screenName === 'results') {
        loadResultsScreen().catch(error => console.log(error))
    }
}

const setTopbar = (leftHtml, rightHtml) => {
    document.getElementById('topbar-left').innerHTML  = leftHtml
    document.getElementById('topbar-right').innerHTML = rightHtml
}

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
    const li = document.createElement('li')
    li.classList.add('checklist-row')
    li.innerHTML = `
        <div class="checklist-info">
            <h4>${name}</h4>
            <span>${partCount} body part${partCount !== 1 ? 's' : ''}</span>
        </div>
        <div class="checklist-actions">
            <button class="btn btn-secondary study-btn">
                <i class="fas fa-book-open"></i> Study
            </button>
        </div>`

    li.querySelector('.study-btn').addEventListener('click', () => {
        window.AppState.currentChecklistId   = id
        window.AppState.currentChecklistName = name
        navigate('study')
    })
    return li
}

// ── Helper: navigate to study from checklist detail ───────────────────────────

const navigateToStudyFromChecklist = () => {
    navigate('study')
}

// ── Init ──────────────────────────────────────────────────────────────────────

// ── Dark mode ─────────────────────────────────────────────────────────────────

const applyTheme = (isDark) => {
    document.documentElement.setAttribute('data-bs-theme', isDark ? 'dark' : 'light')
}

window.addEventListener('load', async () => {
    // Restore saved preference before first paint
    const savedDark = await window.api.getDarkMode()
    applyTheme(savedDark)

    // Listen for menu-triggered toggles
    window.api.onDarkModeChanged((isDark) => applyTheme(isDark))

    navigate('home')
})
