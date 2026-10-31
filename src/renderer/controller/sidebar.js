import {navigate} from "./router.js";
import {AppState} from "./state.js"
import {PAGES} from "../enums/pages.js"
import {isStudySessionActive} from "./study.js";
import {isPracticalActive} from "./practical.js";
import {mustGetElementById} from "../HTMLUtils/domUtils.js"
import {confirmDialog} from "../HTMLUtils/confirmDialog.js"

// Screens holding a session that's lost on leaving, and the warning to show first
const LEAVE_GUARDS = {
    [PAGES.STUDY]: {
        isActive:     isStudySessionActive,
        title:        'Leave study session',
        message:      'Leaving this page will reset the current study session.',
        confirmLabel: 'Leave',
    },
    [PAGES.PRACTICAL]: {
        isActive:     isPracticalActive,
        title:        'Leave practical',
        message:      'Leaving this page will end the current practical without saving it.',
        confirmLabel: 'Leave',
    },
}

mustGetElementById('sidebar').addEventListener('click', async (e) => {
    let navItem = e.target

    if (navItem) {
        //Just in case they click the icon
        if (navItem.tagName.toLowerCase() === 'i') {
            navItem = navItem.parentElement
        }

        const dataTarget = navItem.getAttribute('data-screen')

        if (dataTarget) {
            e.preventDefault()
            let doNavigate = true
            const guard = LEAVE_GUARDS[AppState.currentPage]

            if (guard?.isActive()) {
                doNavigate = await confirmDialog({
                    title:        guard.title,
                    message:      guard.message,
                    confirmLabel: guard.confirmLabel,
                    cancelLabel:  'Stay',
                    danger:       true,
                })
            }

            if (doNavigate) {
                navigate(dataTarget)
            }
        }
    }
})


