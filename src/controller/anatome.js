
document.getElementById('sidebar').addEventListener('click', async (e) => {
    let navItem = e.target

    if (navItem) {
        //Just in case they click the icon
        if (navItem.tagName.toLowerCase() === 'i') {
            navItem = navItem.parentElement
        }

        const dataTarget = navItem.getAttribute('data-screen')

        if (dataTarget) {
            let doNavigate = true

            if (window.AppState.currentPage === 'study' && window.AppState.currentChecklistId) {
                const res = await window.api.dialogQuestion("Are you sure?\nLeaving this page will reset the current study session.")
                doNavigate = res.response === 0
            }

            if (doNavigate) {
                //Reset current checklist; navigate() owns currentPage
                window.AppState.currentChecklistId = null
                navigate(dataTarget)
            }
        }
    }
})


const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]]
    }

    return arr
}