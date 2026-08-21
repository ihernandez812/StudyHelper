// ── Results screen ────────────────────────────────────────────────────────────

const RESULTS_TEMPLATES = {
    resultRow: document.getElementById('tpl-result-row'),
}

const loadResultsScreen = async () => {
    const practicals = await window.api.getPracticals() || {}
    console.log(practicals)
    const list       = document.getElementById('results-list')
    const emptyState = document.getElementById('results-empty')

    Array.from(list.children).forEach(c => { if (c.id !== 'results-empty') c.remove() })

    const keys = Object.keys(practicals)

    if (keys.length === 0) {
        emptyState.classList.remove('hide')
        return
    }

    emptyState.classList.add('hide')

    // Most recent first
    keys.reverse().forEach(id => {
        const practical = practicals[id]
        list.appendChild(createResultRow(id, practical))
    })
}

const createResultRow = (id, practical) => {
    const dateStr        = practical['date']
    const queue       = practical['queue'] || []
    const totalTags     = practical['totalTags'] || 0
    const correctTags = practical['numCorrect'] || 0
    const stationCount = queue.length

    const li = cloneTemplate(RESULTS_TEMPLATES.resultRow)

    li.dataset.id = id
    li.querySelector('.js-name').textContent = dateStr
    li.querySelector('.js-meta').textContent =
        `${stationCount} station${stationCount !== 1 ? 's' : ''} · ${correctTags}  correct tag${correctTags !== 1 ? 's' : ''} · ${totalTags} total tags`

    li.querySelector('[data-action="delete"]').addEventListener('click', async () => {
        const result = await window.api.dialogQuestion(`Are you sure you want to delete the practical take on ${practical['date']}?`)

        if (result.response === 0) {
            await window.api.deletePracticalById(id)
            li.remove()
            const remaining = document.querySelectorAll('#results-list .result-row')

            if (remaining.length === 0) {
                document.getElementById('results-empty').classList.remove('hide')
            }
        }
    })

    return li
}


document.getElementById('results-start-practical-btn').addEventListener('click', () => {
    navigate('practical')
})