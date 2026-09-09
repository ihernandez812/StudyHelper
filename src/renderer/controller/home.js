import {navigate, registerScreen} from "./router.js";
import {cloneTemplate, getActionTarget, mustGetElementById} from "../HTMLUtils/domUtils.js"
import {AppState} from "./state.js"

const TEMPLATES = {
    checklistRow: mustGetElementById('tpl-home-checklist-row'),
}

registerScreen('home', {
    sidebar: 'home',
    load: () => loadHomeScreen(),
    topbar: { title: 'Home' },
})

mustGetElementById('home-add-checklist-btn').addEventListener('click', () => {
    navigate('library')
})

mustGetElementById('home-checklist-list').addEventListener('click', async (e) => {
    const target = getActionTarget(e.target, '.checklist-row');

    if (!target) {
        return;
    }

    const { id, name } = target.data;
    const action = target.action;

    try {
        switch (action) {
            case 'study':
                navigateToStudy(id, name)
                break;
            default:
                console.error(`Unknown action "${action}" on checklist row ${id}`);
        }
    } catch (err) {
        console.error(err);
    }
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
    const row = cloneTemplate(TEMPLATES.checklistRow)

    row.dataset.id   = id
    row.dataset.name = name
    row.querySelector('.js-name').textContent = name
    row.querySelector('.js-meta').textContent = `${partCount} body part${partCount !== 1 ? 's' : ''}`

    return row
}

const navigateToStudy = (id, name) => {
    AppState.currentChecklistId   = id
    AppState.currentChecklistName = name
    navigate('study')
}


