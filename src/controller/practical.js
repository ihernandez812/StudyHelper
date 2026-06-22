// ── Practical screen ──────────────────────────────────────────────────────────

let practicalState = {
    selectedChecklistIds: [],
    bodyPartQueue:        [],
    currentStationIdx:    0,
    currentCoordinates:   {},
    answers:              {},   // tagId → user answer
    timerInterval:        null,
    timeRemaining:        0,
    scale:                1,
    fontSize:             16,
}

// ── Setup ─────────────────────────────────────────────────────────────────────

const loadPracticalSetup = async () => {
    document.getElementById('practical-setup').classList.remove('hide')
    document.getElementById('practical-active').classList.add('hide')

    if (practicalState.timerInterval) {
        clearInterval(practicalState.timerInterval)
        practicalState.timerInterval = null
    }

    const checklists = await window.api.getChecklists()
    const container  = document.getElementById('practical-checklist-select')
    container.innerHTML = ''
    practicalState.selectedChecklistIds = []
    await updatePracticalSummary()

    const keys = Object.keys(checklists)

    if (keys.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <p>No checklists in your library yet.</p>
                <button class="btn btn-primary" onclick="navigate('library')">Go to Library</button>
            </div>`
        return
    }

    keys.forEach(id => {
        const checklist = checklists[id]
        const bpCount   = Object.keys(checklist['bodyParts'] || {}).length

        const label = document.createElement('label')
        label.classList.add('practical-checklist-option')
        label.innerHTML = `
            <input type="checkbox" value="${id}" ${bpCount === 0 ? 'disabled' : ''}>
            <div>
                <span class="practical-cl-name">${checklist['name']}</span>
                <span class="practical-cl-meta">${bpCount} body part${bpCount !== 1 ? 's' : ''}</span>
            </div>`

        label.querySelector('input').addEventListener('change', (e) => {
            if (e.target.checked) {
                practicalState.selectedChecklistIds.push(id)
            } else {
                practicalState.selectedChecklistIds = practicalState.selectedChecklistIds.filter(x => x !== id)
            }
            updatePracticalSummary()
        })

        container.appendChild(label)
    })
}

const updatePracticalSummary = async () => {
    const startBtn   = document.getElementById('practical-start-btn')
    const summaryTxt = document.getElementById('practical-summary-text')
    const ids        = practicalState.selectedChecklistIds

    if (ids.length === 0) {
        summaryTxt.textContent = 'Select at least one checklist to begin.'
        startBtn.disabled = true
        return
    }

    const checklists  = await window.api.getChecklists()
    let totalBodyParts = 0
    ids.forEach(id => {
        totalBodyParts += Object.keys(checklists[id]['bodyParts'] || {}).length
    })

    summaryTxt.textContent =
        `${totalBodyParts} body part${totalBodyParts !== 1 ? 's' : ''} from ${ids.length} checklist${ids.length !== 1 ? 's' : ''}`
    startBtn.disabled = totalBodyParts === 0
}

document.getElementById('practical-start-btn').addEventListener('click', async () => {
    await buildBodyPartQueue()
    startPractical()
})

const buildBodyPartQueue = async () => {
    const checklists = await window.api.getChecklists()
    const queue      = []

    practicalState.selectedChecklistIds.forEach(clId => {
        const bodyParts = checklists[clId]['bodyParts'] || {}
        Object.keys(bodyParts).forEach(bpId => {
            queue.push({ checklistId: clId, bodyPartId: bpId })
        })
    })

    // Shuffle
    for (let i = queue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [queue[i], queue[j]] = [queue[j], queue[i]]
    }

    practicalState.bodyPartQueue    = queue
    practicalState.currentStationIdx = 0
    practicalState.answers          = {}
}

// ── Active test ───────────────────────────────────────────────────────────────

const startPractical = () => {
    document.getElementById('practical-setup').classList.add('hide')
    document.getElementById('practical-active').classList.remove('hide')

    // Start timer if selected
    const timeLimitVal = document.querySelector('input[name="time-limit"]:checked').value
    const timeLimit    = parseInt(timeLimitVal)
    const timerEl      = document.getElementById('practical-timer')

    if (timeLimit > 0) {
        practicalState.timeRemaining = timeLimit
        timerEl.classList.remove('hide')
        updateTimerDisplay()
        practicalState.timerInterval = setInterval(() => {
            practicalState.timeRemaining--
            updateTimerDisplay()
            if (practicalState.timeRemaining <= 0) {
                clearInterval(practicalState.timerInterval)
                endPractical()
            }
        }, 1000)
    } else {
        timerEl.classList.add('hide')
    }

    loadCurrentStation()
}

const updateTimerDisplay = () => {
    const mins = Math.floor(practicalState.timeRemaining / 60).toString().padStart(2, '0')
    const secs = (practicalState.timeRemaining % 60).toString().padStart(2, '0')
    document.getElementById('practical-timer-display').textContent = `${mins}:${secs}`
}

const loadCurrentStation = async () => {
    const station    = practicalState.bodyPartQueue[practicalState.currentStationIdx]
    const bp         = await window.api.getBodyPartById(station.bodyPartId, station.checklistId)
    practicalState.scale        = bp['scale'] || 1
    practicalState.fontSize     = bp['fontSize'] || 16
    practicalState.currentCoordinates = bp['coordinates'] || {}

    document.getElementById('practical-station-name').textContent =
        `${practicalState.currentStationIdx + 1} / ${practicalState.bodyPartQueue.length} — ${bp['name']}`

    const image  = document.getElementById('practical-image')
    const canvas = document.getElementById('practical-canvas')
    image.src    = bp['img']

    image.onload = async () => {
        await drawNewImage(canvas, image, 0, 0, practicalState.scale)
        drawPracticalQuestionMarks()
    }

    if (image.complete) {
        image.onload()
    }
}

const drawPracticalQuestionMarks = () => {
    const canvas = document.getElementById('practical-canvas')

    for (const id in practicalState.currentCoordinates) {
        const stationKey = `${practicalState.currentStationIdx}_${id}`
        const answer = practicalState.answers[stationKey]

        if (answer) {
            drawNewText(canvas, answer, practicalState.currentCoordinates[id], practicalState.fontSize)
        } else {
            drawNewQuestionMark(canvas, practicalState.currentCoordinates[id], practicalState.scale)
        }
    }
}

// Click a tag to answer it
document.getElementById('practical-canvas').addEventListener('click', (e) => {
    const canvas = document.getElementById('practical-canvas')
    const coords = getClickCoordinates(e, practicalState.scale)
    const key    = checkCoordinatesExist(canvas, coords.x, coords.y, practicalState.currentCoordinates, practicalState.scale, false)

    if (key) {
        openPracticalTagModal(key)
    }
})

const practicalTagModal    = new bootstrap.Modal(document.getElementById('practical-tag-modal'))
let _practicalCurrentTagId = null

const openPracticalTagModal = async (tagId) => {
    _practicalCurrentTagId = tagId
    const tag        = practicalState.currentCoordinates[tagId]
    const categoryId = tag['category']
    let prompt       = 'Enter tag'

    if (categoryId && categoryId !== 'null') {
        const category = await window.api.getCategoryById(categoryId)
        if (category) prompt = `What is this ${category}?`
    }

    document.getElementById('practical-tag-prompt').textContent = prompt
    const stationKey = `${practicalState.currentStationIdx}_${tagId}`
    document.getElementById('practical-tag-input').value = practicalState.answers[stationKey] || ''
    practicalTagModal.show()
}

document.getElementById('practical-tag-save-btn').addEventListener('click', () => {
    const txt      = document.getElementById('practical-tag-input').value.trim()
    const stationKey = `${practicalState.currentStationIdx}_${_practicalCurrentTagId}`

    if (txt) {
        practicalState.answers[stationKey] = txt
    }

    practicalTagModal.hide()
    const canvas = document.getElementById('practical-canvas')
    clearCanvas(canvas)
    const image = document.getElementById('practical-image')
    drawNewImage(canvas, image, 0, 0, practicalState.scale).then(drawPracticalQuestionMarks)
})

document.getElementById('practical-next-btn').addEventListener('click', () => {
    practicalState.currentStationIdx++

    if (practicalState.currentStationIdx >= practicalState.bodyPartQueue.length) {
        endPractical()
    } else {
        loadCurrentStation()
    }
})

const endPractical = () => {
    if (practicalState.timerInterval) {
        clearInterval(practicalState.timerInterval)
        practicalState.timerInterval = null
    }
    openPracticalSaveModal()
}

// ── Save practical ────────────────────────────────────────────────────────────

const practicalSaveModal = new bootstrap.Modal(document.getElementById('practical-save-modal'))

const openPracticalSaveModal = () => {
    document.getElementById('practical-save-name').value = ''
    practicalSaveModal.show()
}

document.getElementById('practical-save-btn').addEventListener('click', async () => {
    const name = document.getElementById('practical-save-name').value.trim()

    if (!name) {
        return
    }

    const practicalId = await window.api.generateId()
    const practical   = {
        name:    name,
        date:    new Date().toISOString(),
        queue:   practicalState.bodyPartQueue,
        answers: practicalState.answers,
    }

    await window.api.addPractical(practicalId, practical)
    practicalSaveModal.hide()
    navigate('results')
})
