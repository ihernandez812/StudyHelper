import {navigate} from "./router.js";
import {AppState} from "./state.js"
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
            let doNavigate = true

            if (AppState.currentPage === 'study' && AppState.currentChecklistId) {
                const res = await window.api.dialogQuestion("Are you sure?\nLeaving this page will reset the current study session.")
                doNavigate = res.response === 0
            }

            if (doNavigate) {
                //Reset current checklist; navigate() owns currentPage
                AppState.currentChecklistId = null
                navigate(dataTarget)
            }
        }
    }
})


