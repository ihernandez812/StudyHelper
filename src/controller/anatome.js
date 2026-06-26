
document.getElementById('sidebar').addEventListener('click', async (e) => {
    let navItem = e.target

    if (navItem) {
        //Just in case they click the icon
        if (navItem.tagName.toLowerCase() === 'i') {
            navItem = navItem.parentElement
        }

        let dataTarget = navItem.getAttribute('data-screen')

        if (dataTarget) {
            let doNavigate = true

            if (window.AppState.currentPage === 'study' && window.AppState.currentChecklistId) {
                let res = await window.api.dialogQuestion("Are you sure?\nLeaving this page will reset the current study session.")
                doNavigate = res.response === 0
            }

            if (doNavigate) {
                //Reset current checklist
                window.AppState.currentChecklistId = null
                window.AppState.currentPage = dataTarget
                navigate(dataTarget)
            }
        }
    }
})