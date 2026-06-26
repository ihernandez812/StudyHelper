// ── Study screen ──────────────────────────────────────────────────────────────

let studyState = {
    checklistId:    null,
    bodyPartIdList: [],
    usedIds:        [],
    currentBpId:    null,
    coordinates:    {},
    correctTags:    {},
    answerTag:      {},
    hintText:       '',
    hintsRemaining: 3,
    scale:          1,
    fontSize:       16,
    difficulty:     1,
}



// ── Study picker ──────────────────────────────────────────────────────────────

const loadStudyPicker = async () => {
    // If a checklist was pre-selected (e.g. from Home or Library), jump straight
    // to settings; otherwise show the picker.
    const picker = document.getElementById('study-picker')
    const active = document.getElementById('study-active')
    picker.classList.remove('hide')
    active.classList.add('hide')

    setTopbar(TOPBAR['study'].left(), TOPBAR['study'].right())

    const checklists = await window.api.getChecklists()
    const pickerList = document.getElementById('study-picker-list')
    pickerList.innerHTML = ''

    const keys = Object.keys(checklists)

    if (keys.length === 0) {
        pickerList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <p>No checklists in your library yet.</p>
                <button class="btn btn-primary" onclick="navigate('library')">Go to Library</button>
            </div>`
        return
    }

    // If a checklist was already chosen (e.g. "Study this" from home), open settings
    if (window.AppState.currentChecklistId) {
        openStudySettings(window.AppState.currentChecklistId, checklists[window.AppState.currentChecklistId])
        return
    }

    keys.forEach(id => {
        const checklist = checklists[id]
        const bodyParts = checklist['bodyParts'] || {}
        const bpKeys    = Object.keys(bodyParts)

        const item = document.createElement('div')
        item.classList.add('study-picker-item')
        item.innerHTML = `
            <div>
                <div class="study-picker-name">${checklist['name']}</div>
                <div class="study-picker-meta">${bpKeys.length} body part${bpKeys.length !== 1 ? 's' : ''}</div>
            </div>
            <div class="study-picker-actions">
                <button class="btn btn-secondary random-one-btn" ${bpKeys.length === 0 ? 'disabled' : ''}>
                    Random body part
                </button>
                <button class="btn btn-primary study-all-btn" ${bpKeys.length === 0 ? 'disabled' : ''}>
                    <i class="fas fa-book-open"></i> Study all
                </button>
            </div>`

        item.querySelector('.random-one-btn').addEventListener('click', () => {
            const randomId = bpKeys[Math.floor(Math.random() * bpKeys.length)]
            window.AppState.currentChecklistId = id
            openStudySettings(id, checklist, [randomId])
        })

        item.querySelector('.study-all-btn').addEventListener('click', () => {
            window.AppState.currentChecklistId = id
            openStudySettings(id, checklist, bpKeys)
        })

        pickerList.appendChild(item)
    })
}

// ── Study settings modal ──────────────────────────────────────────────────────

const studySettingsModal = new bootstrap.Modal(document.getElementById('study-settings-modal'))
let _pendingBpIds = []

const openStudySettings = (checklistId, checklist, bpIds = null) => {
    const bodyParts = checklist['bodyParts'] || {}
    _pendingBpIds = bpIds || Object.keys(bodyParts)
    studySettingsModal.show()
}

document.getElementById('study-settings-save-btn').addEventListener('click', () => {
    studyState.difficulty     = parseInt(document.getElementById('study-difficulty').value)
    studyState.hintsRemaining = parseInt(document.getElementById('study-hints').value)
    studySettingsModal.hide()
    beginStudySession(_pendingBpIds)
})

// ── Active study session ──────────────────────────────────────────────────────

const beginStudySession = (bpIds) => {
    studyState.bodyPartIdList = bpIds
    studyState.usedIds        = []
    studyState.checklistId    = window.AppState.currentChecklistId
    studyState.correctTags    = {}
    studyState.hintText       = ''

    document.getElementById('study-picker').classList.add('hide')
    document.getElementById('study-active').classList.remove('hide')

    // Show "next" button only if more than one body part
    const nextBtn = document.getElementById('study-next-btn')
    nextBtn.classList.toggle('hide', bpIds.length <= 1)

    loadNextBodyPart().catch(err => {
        console.warn(err)
    })
}

const loadNextBodyPart = async () => {
    // Pick a random unused body part
    let bpId

    do {
        bpId = studyState.bodyPartIdList[Math.floor(Math.random() * studyState.bodyPartIdList.length)]
    } while (studyState.usedIds.includes(bpId) && studyState.usedIds.length < studyState.bodyPartIdList.length)

    studyState.usedIds.push(bpId)
    studyState.currentBpId  = bpId
    studyState.correctTags  = {}
    studyState.hintText     = ''
    studyState.answerTag    = {}

    // Update progress
    const done  = studyState.usedIds.length
    const total = studyState.bodyPartIdList.length
    document.getElementById('study-progress-label').textContent = `Body part ${done} of ${total}`
    const pct = (done / total) * 100
    document.getElementById('study-progress-bar').style.width = `${pct}%`

    // Hide "next" when all done
    if (studyState.usedIds.length >= studyState.bodyPartIdList.length) {
        document.getElementById('study-next-btn').classList.add('hide')
    }

    const bp  = await window.api.getBodyPartById(bpId, studyState.checklistId)
    studyState.scale    = bp['scale'] || 1
    studyState.fontSize = bp['fontSize'] || 16
    studyState.coordinates = bp['coordinates'] || {}

    document.getElementById('study-body-part-name').textContent = bp['name']
    document.getElementById('study-tags-progress').textContent =
        `0 / ${Object.keys(studyState.coordinates).length} tags labeled`

    const image  = document.getElementById('study-image')
    const canvas = document.getElementById('study-canvas')
    image.src    = bp['image']

    image.onload = async () => {
        await drawNewImage(canvas, image, 0, 0, studyState.scale)
        drawAllQuestionMarks()
    }


    if (image.complete) {
        image.onload()
    }

    // Word bank
    setupWordBank()
    // Hints
    updateHintButton()
}

const drawAllQuestionMarks = () => {
    const canvas = document.getElementById('study-canvas')

    for (const id in studyState.coordinates) {
        const isCorrect = !!studyState.correctTags[id]

        if (isCorrect) {
            drawNewText(canvas, studyState.coordinates[id]['name'], studyState.coordinates[id], studyState.fontSize)
        } else {
            drawNewQuestionMark(canvas, studyState.coordinates[id], studyState.scale, studyState.fontSize)
        }
    }
}

const setupWordBank = () => {
    const wordbank = document.getElementById('study-wordbank')
    const wrap     = document.getElementById('study-wordbank-wrap')
    wordbank.innerHTML = ''

    const useWordBank = studyState.difficulty < 3
    wrap.style.display = useWordBank ? 'block' : 'none'

    if (!useWordBank) {
        return
    }

    for (const id in studyState.coordinates) {
        const span = document.createElement('span')
        span.classList.add('word-chip')
        span.dataset.tagId = id
        span.textContent = studyState.coordinates[id]['name']
        wordbank.appendChild(span)
    }
}

const updateWordBank = () => {
    document.querySelectorAll('#study-wordbank .word-chip').forEach(chip => {
        if (studyState.correctTags[chip.dataset.tagId]) {
            chip.classList.add('used')
        }
    })
}

const updateHintButton = () => {
    const btn     = document.getElementById('study-hint-btn')
    const useHints = studyState.difficulty < 4
    btn.disabled  = !useHints || studyState.hintsRemaining <= 0
    btn.textContent = useHints
        ? `Use a hint (${studyState.hintsRemaining} left)`
        : 'No hints available'
}

document.getElementById('study-hint-btn').addEventListener('click', () => {
    const answer  = Object.values(studyState.answerTag)[0]

    if (!answer) {
        return
    }

    studyState.hintText = answer.substring(0, studyState.hintText.length + 1)
    studyState.hintsRemaining--
    updateHintButton()
    window.api.popup(`Hint: word starts with "${studyState.hintText}"`)
})

// Click on canvas to answer a tag
document.getElementById('study-canvas').addEventListener('click', (e) => {
    const canvas  = document.getElementById('study-canvas')
    const coords  = getClickCoordinates(e, studyState.scale)
    const key     = checkCoordinatesExist(canvas, coords.x, coords.y, studyState.coordinates, studyState.scale, studyState.fontSize,false)

    if (key && !studyState.correctTags[key]) {
        openStudyAnswerModal(key)
    }
})

const studyAnswerModal = new bootstrap.Modal(document.getElementById('study-answer-modal'))

const openStudyAnswerModal = async (tagId) => {
    const tag       = studyState.coordinates[tagId]
    const categoryId = tag['category']
    let prompt      = 'What is this?'

    if (categoryId && categoryId !== 'null') {
        const category = await window.api.getCategoryById(categoryId)
        if (category) {
            prompt = `What is this ${category}?`
        }
    }

    studyState.answerTag = { [tagId]: tag['name'] }
    studyState.hintText  = ''
    document.getElementById('study-answer-modal-label').textContent = prompt
    document.getElementById('study-answer-input').value = ''
    studyAnswerModal.show()
}

document.getElementById('study-answer-submit-btn').addEventListener('click', async () => {
    const input   = document.getElementById('study-answer-input')
    const txt     = input.value.trim()

    if (!txt) {
        return
    }

    const [tagId, answer] = Object.entries(studyState.answerTag)[0]

    if (txt.toLowerCase() === answer.toLowerCase()) {
        studyAnswerModal.hide()
        studyState.correctTags[tagId] = answer
        updateTagsProgress()
        updateWordBank()
        const canvas = document.getElementById('study-canvas')
        clearCanvas(canvas)
        const image  = document.getElementById('study-image')
        await drawNewImage(canvas, image, 0, 0, studyState.scale)
        drawAllQuestionMarks()
        await window.api.popup('Correct!')
    } else {
        await window.api.popup('Not quite — try again.')
    }
})

const updateTagsProgress = () => {
    const total   = Object.keys(studyState.coordinates).length
    const correct = Object.keys(studyState.correctTags).length
    document.getElementById('study-tags-progress').textContent = `${correct} / ${total} tags labeled`
}

document.getElementById('study-next-btn').addEventListener('click', () => {
    loadNextBodyPart()
})

//Navigation
document.getElementById('home-add-checklist-btn').addEventListener('click', () => {
    navigate('library')
})