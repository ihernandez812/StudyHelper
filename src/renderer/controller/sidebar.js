import {navigate} from "./router.js";
import {AppState, PAGES} from "./state.js"
import {isStudySessionActive} from "./study.js";
import {mustGetElementById} from "../HTMLUtils/domUtils.js"

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

            if (AppState.currentPage === PAGES.STUDY && isStudySessionActive()) {
                const res = await window.api.dialogQuestion("Are you sure?\nLeaving this page will reset the current study session.")
                doNavigate = res.response === 0
            }

            if (doNavigate) {
                navigate(dataTarget)
            }
        }
    }
})


