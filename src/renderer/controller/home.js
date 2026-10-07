import { registerScreen} from "./router.js";
import {PAGES} from "./state.js";

const TEMPLATES = {
    //TODO This will eventually have the metrics template
}

registerScreen(PAGES.HOME, {
    sidebar: PAGES.HOME,
    load: () => loadHomeScreen(),
    topbar: { title: 'Home' },
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

    //Add Metrics template stuff here
}


