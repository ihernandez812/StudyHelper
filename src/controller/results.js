// ── Results screen ────────────────────────────────────────────────────────────

const RESULTS_TEMPLATES = {
    resultRow: document.getElementById('tpl-result-row'),
}

document.addEventListener('results-list', async (e) => {
    const target = getActionTarget(e.target, '.result-row');

    if (!target) {
        return;
    }

    const { id, dateStr } = target.data;
    const action = target.action;
    const parentElement = target.parentElement;

    try {
        switch (action) {
            case 'open' :
                //TODO create view practical results
                break;
            case 'delete':
                await deleteResultRow(id, dateStr, parentElement);
                break;
            default:
                console.error(`Unknown action "${action}" on result row ${id}`);
        }
    } catch (err) {
        console.error(err);
    }
})

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
    li.dataset.date = dateStr
    li.querySelector('.js-name').textContent = dateStr
    li.querySelector('.js-meta').textContent =
        `${stationCount} station${stationCount !== 1 ? 's' : ''} · ${correctTags}  correct tag${correctTags !== 1 ? 's' : ''} · ${totalTags} total tags`

    return li
}

const deleteResultRow = async (id, dateStr, rowElement) => {
    const result = await window.api.dialogQuestion(`Are you sure you want to delete the practical take on ${dateStr}?`)

    if (result.response === 0) {
        await window.api.deletePracticalById(id)
        rowElement.remove()
        const remaining = document.querySelectorAll('#results-list .result-row')

        if (remaining.length === 0) {
            document.getElementById('results-empty').classList.remove('hide')
        }
    }
}


document.getElementById('results-start-practical-btn').addEventListener('click', () => {
    navigate('practical')
})