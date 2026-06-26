// ── Results screen ────────────────────────────────────────────────────────────

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
    const date        = practical['date']
    const queue       = practical['queue'] || []
    const answers     = practical['answers'] || {}
    const stationCount = queue.length

    // Calculate score: count tags where answer matches (case-insensitive)
    let totalTags  = 0
    let correctTags = 0

    queue.forEach((station, idx) => {
        // We don't have coordinates stored on result, so count answered vs unanswered
        for (const key in answers) {
            if (key.startsWith(`${idx}_`)) {
                totalTags++
                correctTags++  // All saved answers count; scoring was done at input time
            }
        }
    })

    const li = document.createElement('li')
    li.classList.add('result-row')
    li.innerHTML = `
        <div class="result-info">
            <h4 class="result-name">${practical['name']}</h4>
            <span class="result-meta">${dateStr} · ${stationCount} station${stationCount !== 1 ? 's' : ''} · ${correctTags} tag${correctTags !== 1 ? 's' : ''} answered</span>
        </div>
        <button class="btn btn-ghost btn-icon delete-result-btn" title="Delete">
            <i class="fas fa-trash"></i>
        </button>`

    li.querySelector('.delete-result-btn').addEventListener('click', async () => {
        const result = await window.api.dialogQuestion(`Delete "${practical['name']}"?`)

        if (result.response === 0) {
            window.api.deletePracticalById(id)

            console.log('deleted practical', id)
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