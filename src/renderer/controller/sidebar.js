import {navigate} from "./router.js";
import {AppState} from "./state.js"
import {PAGES} from "../enums/pages.js"
import {isStudySessionActive} from "./study.js";
import {isPracticalActive} from "./practical.js";
import {mustGetElementById} from "../HTMLUtils/domUtils.js"

// Screens holding a session that's lost on leaving, and the warning to show first
const LEAVE_GUARDS = {
    [PAGES.STUDY]: {
        isActive: isStudySessionActive,
        message:  "Are you sure?\nLeaving this page will reset the current study session.",
    },
    [PAGES.PRACTICAL]: {
        isActive: isPracticalActive,
        message:  "Are you sure?\nLeaving this page will end the current practical without saving it.",
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
                const res = await window.api.dialogQuestion(guard.message)
                doNavigate = res.response === 0
            }

            if (doNavigate) {
                navigate(dataTarget)
            }
        }
    }
})


