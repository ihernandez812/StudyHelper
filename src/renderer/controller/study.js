
import { registerScreen, navigate } from "./router.js";
import {drawNewImage, drawNewText, drawNewQuestionMark,
    checkCoordinatesExist, getClickCoordinates, redrawSync,
    enableDragOntoCanvas, animateFrames, shakeOffset, SHAKE_DURATION, TAG_COLORS} from "../HTMLUtils/canvasUtils.js"
import {cloneTemplate, getActionTarget, mustGetElementById, createImageUrl} from "../HTMLUtils/domUtils.js"
import {PAGES} from "./state.js";
import {createSessionNav} from "../HTMLUtils/sessionNav.js"

// ── Study screen ──────────────────────────────────────────────────────────────


// study.js
registerScreen(PAGES.STUDY, {
    sidebar: PAGES.STUDY,
    load: () => loadStudyPicker(),
    teardown: () => {
        clearStudySession();
        clearSelection()
    },
    topbar: { title: 'Study' },
})
const TEMPLATES = {
    pickerItem:        mustGetElementById('tpl-study-picker-item'),
    noChecklistsEmpty: mustGetElementById('tpl-no-checklists-empty'),
    bodyPartListItem:  mustGetElementById('tpl-study-browse-item'),
    selectionChip:     mustGetElementById('tpl-study-selection-chip'),
    settingsGroup:     mustGetElementById('tpl-study-settings-group'),
    searchResult:      mustGetElementById('tpl-study-search-result'),
}

const studyState = {
    bodyParts : [],
    currentBpId:    null,
    coordinates:    {},
    correctTags:    {},
    answerTag:      {},
    hintText:       '',
    hintsRemaining: 3,
    scale:          1,
    fontSize:       16,
    difficulty:     1,
    answeredTags: {},
    dropTarget:     null, // '?' under a dragged chip, drawn highlighted
    wrongDrop:      null, // { key, offsetX } while a wrong drop is shaking
}

const bodyPartSelection = new Map()

const DIFFICULTY = {
    EASY:      0,
    MEDIUM:    1,
    HARD:      2,
}

//Steps for moving through the search results with the arrow keys
const DIRECTION = {
    NEXT:     1,
    PREVIOUS: -1,
}

mustGetElementById('study-picker-list').addEventListener('click', async (e) => {
    //If there are no body parts to study if it is empty and the only thing to be clicked is a navigate to library
    if (e.target.closest('[data-action="go-to-library"]')) {
        navigate(PAGES.LIBRARY)
        return
    }


    const target = getActionTarget(e.target, '.study-picker-item');

    if (!target) {
        return;
    }

    const { id } = target.data;
    const action = target.action;
    const element = target.element;

    try {
        switch (action) {
            case 'all':
                if (await confirmDiscardSelection()) {
                    await loadStudySettings(id)
                }

                break;
            case 'random':
                if (await confirmDiscardSelection()) {
                    await loadRandomBodyStudySession(id);
                }

                break;
            case 'toggle-browse':
                await toggleChecklistRow(id, element);
                break;
            default:
                console.error(`Unknown action "${action}" on checklist row ${id}`);
        }
    } catch (err) {
        console.error(err);
    }
})

mustGetElementById('study-picker-list').addEventListener('change', (e) => {
    const row = e.target.closest('.study-picker-item')

    if (!row) {
        return
    }

    if (e.target.matches('.js-select-all')) {
        row.querySelectorAll('.js-checkbox:not(:disabled)').forEach(checkbox => {
            setSelected(getBrowseItem(checkbox), e.target.checked)
        })
    } else if (e.target.matches('.js-checkbox')) {
        setSelected(getBrowseItem(e.target), e.target.checked)
    }

    onSelectionChanged()
})

// Turns a checkbox's browse row back into a selection entry
const getBrowseItem = (checkbox) => {
    const { checklistId, bodyPartId, bodyPartName, checklistName } = checkbox.closest('li').dataset
    return { checklistId, bodyPartId, bodyPartName, checklistName }
}

// Re-tick every rendered checkbox from the selection (expanded rows only)
const syncBrowseCheckboxes = () => {
    document.querySelectorAll('#study-picker-list .study-picker-item').forEach(row => {
        row.querySelectorAll('.js-checkbox').forEach(checkbox => {
            const { checklistId, bodyPartId } = checkbox.closest('li').dataset
            checkbox.checked = bodyPartSelection.has(createSelectionKey(checklistId, bodyPartId))
        })

        updateSelectAll(row)
    })
}

const confirmDiscardSelection = async () => {
    if (bodyPartSelection.size === 0) {
        return true
    }

    const count  = bodyPartSelection.size
    const result = await window.api.dialogQuestion(
        `You have ${count} body part${count !== 1 ? 's' : ''} selected.\nStarting this session will clear them.`
    )

    return result.response === 0
}

const updateSelectAll = (row) => {
    const selectAll  = row.querySelector('.js-select-all')
    const selectable = row.querySelectorAll('.js-checkbox:not(:disabled)')
    const checked    = row.querySelectorAll('.js-checkbox:not(:disabled):checked')

    selectAll.disabled      = selectable.length === 0
    selectAll.checked       = selectable.length > 0 && checked.length === selectable.length
    selectAll.indeterminate = checked.length > 0 && checked.length < selectable.length
}

// ── Study picker ──────────────────────────────────────────────────────────────

const loadStudyPicker = async () => {
    const picker = document.getElementById('study-picker')
    const active = document.getElementById('study-active')
    picker.classList.remove('hide')
    active.classList.add('hide')

    const checklists = await window.api.getChecklists()
    const pickerList = document.getElementById('study-picker-list')
    pickerList.replaceChildren()

    const keys = Object.keys(checklists)

    resetSearch()
    searchIndex = buildSearchIndex(checklists)
    document.getElementById('study-search').classList.toggle('hide', keys.length === 0)

    if (keys.length === 0) {
        const emptyState = cloneTemplate(TEMPLATES.noChecklistsEmpty)
        pickerList.appendChild(emptyState)
        return
    }

    keys.forEach(id => {
        const checklist = checklists[id]
        const bodyParts = checklist['bodyParts'] || {}
        const bpKeys    = Object.keys(bodyParts)

        const item       = cloneTemplate(TEMPLATES.pickerItem)
        const randomBtn  = item.querySelector('[data-action="random"]')
        const studyAllBtn = item.querySelector('[data-action="all"]')

        item.dataset.id = id
        item.querySelector('.js-name').textContent = checklist['name']
        item.querySelector('.js-meta').textContent = `${bpKeys.length} body part${bpKeys.length !== 1 ? 's' : ''}`

        const isStudyDisabled = !hasStudiableBodyPart(bodyParts);

        randomBtn.disabled   = isStudyDisabled
        studyAllBtn.disabled = isStudyDisabled

        pickerList.appendChild(item)
    })
}

const hasStudiableBodyPart = (bodyPartsList) => {
    let isStudiable = false
    const bodyPartKeys = Object.keys(bodyPartsList)

    if (bodyPartKeys.length > 0) {
        for(let bodyPartKey of bodyPartKeys) {
            const bodyPart = bodyPartsList[bodyPartKey]
            const coordinatesMap = bodyPart['coordinates'] || {}
            const tagCount = Object.keys(coordinatesMap).length

            if (tagCount > 0) {
                isStudiable = true;
                break;
            }
        }
    }

    return isStudiable
}

const createBodyPartItemsFromChecklistId = async (checklistId) => {
    let bodyPartItemList = []

    try {
        const checklist = await window.api.getChecklistById(checklistId)
        const bodyParts = checklist['bodyParts'] || {}
        const bodyPartIdList = Object.keys(bodyParts)

        for (const bodyPartId of bodyPartIdList) {
            const bodyPart = bodyParts[bodyPartId]
            const coordinatesMap = bodyPart['coordinates'] || {}
            const tagCount = Object.keys(coordinatesMap).length

            if (tagCount > 0) {
                bodyPartItemList.push({
                    bodyPartId: bodyPartId,
                    checklistId: checklistId,
                    bodyPartName: bodyPart['name'],
                    checklistName: checklist['name']})
            }
        }
    } catch (err) {
        console.error(err)
    }

    return bodyPartItemList
}

const createRandomBodyPartItemsFromChecklistId = async (checklistId) => {
    let randomBodyPartItemList = []

    try {
        const bodyPartItemList = await createBodyPartItemsFromChecklistId(checklistId)
        let randomBodyPartItem = bodyPartItemList[Math.floor(Math.random() * bodyPartItemList.length)]

        if (randomBodyPartItem) {
            randomBodyPartItemList.push(randomBodyPartItem)
        }
    } catch (err) {
        console.error(err)
    }

    return randomBodyPartItemList
}

const loadStudySettings = async (checklistId) => {
    try {
        const bodyPartItemsList = await createBodyPartItemsFromChecklistId(checklistId)
        await openStudySettings(bodyPartItemsList);
    } catch (err) {
        console.error(err)
    }
}

const loadRandomBodyStudySession = async (checklistId) => {
    try {
        const bodyPartItemList = await createRandomBodyPartItemsFromChecklistId(checklistId)
        await openStudySettings(bodyPartItemList);
    } catch (err) {
        console.error(err)
    }
}

// ── Study settings modal ──────────────────────────────────────────────────────

const studySettingsModal = new bootstrap.Modal(mustGetElementById('study-settings-modal'))
let _pendingBodyPartList = []

// Most body part names listed in the settings modal before "and N more"
const SETTINGS_LIST_MAX = 8

const openStudySettings = async (items) => {
    // Render before shuffling so checklists keep the order they were picked in
    renderStudySettingsList(items)
    _pendingBodyPartList = shuffle(items)
    studySettingsModal.show()
}

const renderStudySettingsList = (items) => {
    const list = document.getElementById('study-settings-list')
    const more = document.getElementById('study-settings-more')

    // Group by checklist, keeping checklists in the order they first appear
    const groups = new Map()

    items.forEach(item => {
        if (!groups.has(item.checklistId)) {
            groups.set(item.checklistId, { checklistName: item.checklistName, bodyPartNames: [] })
        }

        groups.get(item.checklistId).bodyPartNames.push(item.bodyPartName)
    })

    const bodyPartCount  = items.length
    const checklistCount = groups.size
    document.getElementById('study-settings-summary').textContent =
        `${bodyPartCount} body part${bodyPartCount !== 1 ? 's' : ''} from ` +
        `${checklistCount} checklist${checklistCount !== 1 ? 's' : ''}`

    list.replaceChildren()
    let shown = 0

    for (const { checklistName, bodyPartNames } of groups.values()) {
        if (shown >= SETTINGS_LIST_MAX) {
            break
        }

        const names = [...bodyPartNames]
            .sort((a, b) => a.localeCompare(b))
            .slice(0, SETTINGS_LIST_MAX - shown)
        shown += names.length

        const group = cloneTemplate(TEMPLATES.settingsGroup)
        group.querySelector('.js-checklist-name').textContent = checklistName
        group.querySelector('.js-bp-names').textContent = names.join(', ')
        list.appendChild(group)
    }

    const hidden = bodyPartCount - shown
    more.textContent = `and ${hidden} more`
    more.classList.toggle('hide', hidden === 0)
}

mustGetElementById('study-settings-save-btn').addEventListener('click', () => {
    studyState.difficulty     = parseInt(document.getElementById('study-difficulty').value)
    studyState.hintsRemaining = studyState.difficulty === DIFFICULTY.EASY ? 3 : 0;
    studySettingsModal.hide()
    beginStudySession(_pendingBodyPartList)
})

// ── Active study session ──────────────────────────────────────────────────────

const studyNav = createSessionNav({
    label:       mustGetElementById('study-progress-label'),
    bar:         mustGetElementById('study-progress-bar'),
    prevBtn:     mustGetElementById('study-prev-btn'),
    nextBtn:     mustGetElementById('study-next-btn'),
    btnGroup:    mustGetElementById('body-part-btn-group'),
    formatLabel: (position, count) => `Body part ${position} of ${count}`,
    onChange:    (index, previousIndex) => showBodyPart(index, previousIndex),
})

const beginStudySession = (items) => {
    studyState.bodyParts = items
    studyState.correctTags    = {}
    studyState.hintText       = ''
    studyState.answeredTags   = {}
    clearSelection()

    document.getElementById('study-picker').classList.add('hide')
    document.getElementById('study-active').classList.remove('hide')

    studyNav.start(items.length).catch(err => {
        console.error(err)
    })
}

const showBodyPart = async (index, previousIndex) => {
    // Keep what was answered on the body part being left, so coming back restores it
    if (previousIndex != null) {
        const previousItem = studyState.bodyParts[previousIndex]
        const previousKey  = createSelectionKey(previousItem.checklistId, previousItem.bodyPartId)
        studyState.answeredTags[previousKey] = studyState.correctTags
    }

    studyState.correctTags = {}
    studyState.hintText    = ''
    studyState.answerTag   = {}
    studyState.dropTarget  = null
    studyState.wrongDrop   = null

    const item     = studyState.bodyParts[index]
    const bodyPart = await window.api.getBodyPartById(item.bodyPartId, item.checklistId)
    studyState.scale       = bodyPart['scale'] || 1
    studyState.fontSize    = bodyPart['fontSize'] || 16
    studyState.coordinates = bodyPart['coordinates'] || {}
    studyState.correctTags = studyState.answeredTags[createSelectionKey(item.checklistId, item.bodyPartId)] || {}

    document.getElementById('study-body-part-name').textContent      = bodyPart['name']
    document.getElementById('study-body-part-checklist').textContent = item.checklistName
    updateTagsProgress()

    const image  = document.getElementById('study-image')
    const canvas = document.getElementById('study-canvas')
    image.src = createImageUrl(bodyPart['image'])

    try {
        await drawNewImage(canvas, image, 0, 0, studyState.scale)
        drawAllQuestionMarks()
    } catch (err) {
        console.error(err)
    }

    // Word bank, greying out words already used on this body part
    setupWordBank()
    updateWordBank()
    // Hints
    updateHintButton()
}

const createSelectionKey = (checklistId, bodyPartId) => {
    return `${checklistId}:${bodyPartId}`
}

const setSelected = (item, isSelected) => {
    const key = createSelectionKey(item.checklistId, item.bodyPartId)

    if (isSelected) {
        bodyPartSelection.set(key, item)
    } else {
        bodyPartSelection.delete(key)
    }
}

const clearSelection = () => {
    bodyPartSelection.clear()
    onSelectionChanged()
}

// One place that refreshes everything that shows the selection
const onSelectionChanged = () => {
    syncBrowseCheckboxes()
    renderSelectionTray()

    if (isSearchOpen()) {
        renderSearchResults()
    }
}

// ── Selection tray ────────────────────────────────────────────────────────────

const renderSelectionTray = () => {
    const tray  = document.getElementById('study-selection')
    const chips = document.getElementById('study-selection-chips')
    const items = [...bodyPartSelection.values()]

    chips.replaceChildren()
    tray.classList.toggle('hide', items.length === 0)

    if (items.length === 0) {
        return
    }

    const checklistCount = new Set(items.map(item => item.checklistId)).size
    document.getElementById('study-selection-count').textContent =
        `${items.length} selected from ${checklistCount} checklist${checklistCount !== 1 ? 's' : ''}`

    items.forEach(item => {
        const chip      = cloneTemplate(TEMPLATES.selectionChip)
        const removeBtn = chip.querySelector('[data-action="remove-selection"]')

        chip.dataset.checklistId = item.checklistId
        chip.dataset.bodyPartId  = item.bodyPartId
        chip.querySelector('.js-label').textContent = `${item.bodyPartName} · ${item.checklistName}`
        removeBtn.setAttribute('aria-label', `Remove ${item.bodyPartName}`)

        chips.appendChild(chip)
    })
}

mustGetElementById('study-selection-chips').addEventListener('click', (e) => {
    const target = getActionTarget(e.target, '.study-selection-chip')

    if (!target || target.action !== 'remove-selection') {
        return
    }

    const { checklistId, bodyPartId } = target.data
    bodyPartSelection.delete(createSelectionKey(checklistId, bodyPartId))
    onSelectionChanged()
})

mustGetElementById('study-selection-clear-btn').addEventListener('click', () => {
    clearSelection()
})

mustGetElementById('study-selection-study-btn').addEventListener('click', () => {
    openStudySettings([...bodyPartSelection.values()]).catch(err => {
        console.error(err)
    })
})

// ── Body part search ──────────────────────────────────────────────────────────

// Most results shown in the dropdown before "Keep typing to narrow it down"
const SEARCH_MAX = 8

const MATCH_RANK = {
    PREFIX:     0,   // "fem"   → Femur
    WORD_START: 1,   // "brach" → Biceps brachii
    CONTAINS:   2,   // "brach" → Coracobrachialis
}

// Every body part in every checklist, rebuilt each time the picker loads
let searchIndex = []

const searchState = {
    query:       '',
    results:     [],   // ranked matches for the current query, uncapped
    activeIndex: -1,   // highlighted row in the dropdown, -1 for none
}

const buildSearchIndex = (checklists) => {
    const index = []

    for (const checklistId in checklists) {
        const checklist = checklists[checklistId]
        const bodyParts = checklist['bodyParts'] || {}

        for (const bodyPartId in bodyParts) {
            const bodyPart = bodyParts[bodyPartId]

            index.push({
                checklistId,
                bodyPartId,
                bodyPartName:  bodyPart['name'],
                checklistName: checklist['name'],
                tagCount:      Object.keys(bodyPart['coordinates'] || {}).length,
                nameLower:     bodyPart['name'].toLowerCase(),
            })
        }
    }

    return index
}

const resetSearch = () => {
    document.getElementById('study-search-input').value = ''
    searchState.query = ''
    closeSearch()
}

// Returns { rank, index } for where the query matches, or null if it doesn't
const matchBodyPart = (nameLower, query) => {
    if (nameLower.startsWith(query)) {
        return { rank: MATCH_RANK.PREFIX, index: 0 }
    }

    // Start of any later word: after a space, hyphen, slash, or "("
    for (let i = 1; i < nameLower.length; i++) {
        if (/[\s\-/(]/.test(nameLower[i - 1]) && nameLower.startsWith(query, i)) {
            return { rank: MATCH_RANK.WORD_START, index: i }
        }
    }

    const index = nameLower.indexOf(query)
    return index === -1 ? null : { rank: MATCH_RANK.CONTAINS, index }
}

const runSearch = () => {
    const query = document.getElementById('study-search-input').value.trim().toLowerCase()
    searchState.query = query

    if (!query) {
        closeSearch()
        return
    }

    searchState.results = searchIndex
        .map(entry => ({ entry, match: matchBodyPart(entry.nameLower, query) }))
        .filter(({ match }) => match !== null)
        .sort((a, b) =>
            a.match.rank - b.match.rank ||
            a.entry.bodyPartName.localeCompare(b.entry.bodyPartName) ||
            a.entry.checklistName.localeCompare(b.entry.checklistName))

    searchState.activeIndex = findSelectableIndex(-1, DIRECTION.NEXT)
    renderSearchResults()
}

const renderSearchResults = () => {
    const list   = document.getElementById('study-search-results')
    const empty  = document.getElementById('study-search-empty')
    const footer = document.getElementById('study-search-footer')
    const shown  = searchState.results.slice(0, SEARCH_MAX)

    list.replaceChildren()

    shown.forEach(({ entry, match }, i) => {
        const row        = cloneTemplate(TEMPLATES.searchResult)
        const isSelected = bodyPartSelection.has(createSelectionKey(entry.checklistId, entry.bodyPartId))
        const isDisabled = entry.tagCount === 0

        row.id = `study-search-result-${i}`
        row.dataset.index = i
        row.classList.toggle('selected', isSelected)
        row.classList.toggle('disabled', isDisabled)
        row.classList.toggle('active',   i === searchState.activeIndex)
        row.setAttribute('aria-selected', isSelected)

        if (isDisabled) {
            row.setAttribute('aria-disabled', 'true')
        }

        appendHighlightedName(row.querySelector('.js-bp-name'), entry.bodyPartName, match.index, searchState.query.length)

        const tagText = isDisabled ? 'No tags yet' : `${entry.tagCount} tag${entry.tagCount !== 1 ? 's' : ''}`
        row.querySelector('.js-meta').textContent = `${entry.checklistName} · ${tagText}`

        list.appendChild(row)
    })

    const total = searchState.results.length
    empty.classList.toggle('hide', total > 0)
    footer.textContent = `Showing ${SEARCH_MAX} of ${total}. Keep typing to narrow it down.`
    footer.classList.toggle('hide', total <= SEARCH_MAX)

    openSearch()
}

// Builds "Bi<mark>ceps</mark> brachii" out of text nodes, never innerHTML
const appendHighlightedName = (element, name, start, length) => {
    const mark = document.createElement('mark')
    mark.textContent = name.slice(start, start + length)

    element.replaceChildren(name.slice(0, start), mark, name.slice(start + length))
}

const openSearch = () => {
    const input     = document.getElementById('study-search-input')
    const activeRow = document.getElementById(`study-search-result-${searchState.activeIndex}`)

    document.getElementById('study-search-dropdown').classList.remove('hide')
    input.setAttribute('aria-expanded', 'true')

    if (activeRow) {
        input.setAttribute('aria-activedescendant', activeRow.id)
    } else {
        input.removeAttribute('aria-activedescendant')
    }
}

const closeSearch = () => {
    const input = document.getElementById('study-search-input')

    document.getElementById('study-search-dropdown').classList.add('hide')
    input.setAttribute('aria-expanded', 'false')
    input.removeAttribute('aria-activedescendant')
    searchState.activeIndex = -1
}

const isSearchOpen = () => !document.getElementById('study-search-dropdown').classList.contains('hide')

// Next row in `direction` that has tags, wrapping around; -1 if none can be selected
const findSelectableIndex = (from, direction) => {
    const count = Math.min(searchState.results.length, SEARCH_MAX)

    for (let step = 1; step <= count; step++) {
        const i = ((from + direction * step) % count + count) % count

        if (searchState.results[i].entry.tagCount > 0) {
            return i
        }
    }

    return -1
}

const toggleSearchResult = (index) => {
    const result = searchState.results[index]

    if (!result || result.entry.tagCount === 0) {
        return
    }

    const { checklistId, bodyPartId, bodyPartName, checklistName } = result.entry
    const isSelected = bodyPartSelection.has(createSelectionKey(checklistId, bodyPartId))

    setSelected({ checklistId, bodyPartId, bodyPartName, checklistName }, !isSelected)
    onSelectionChanged()
}

const searchInput = mustGetElementById('study-search-input')

searchInput.addEventListener('input', runSearch)

searchInput.addEventListener('focus', () => {
    if (searchState.query) {
        runSearch()
    }
})

searchInput.addEventListener('blur', closeSearch)

searchInput.addEventListener('keydown', (e) => {
    if (!isSearchOpen()) {
        return
    }

    switch (e.key) {
        case 'ArrowDown':
        case 'ArrowUp': {
            e.preventDefault()
            const direction = e.key === 'ArrowDown' ? DIRECTION.NEXT : DIRECTION.PREVIOUS
            const next = findSelectableIndex(searchState.activeIndex, direction)

            if (next !== -1) {
                searchState.activeIndex = next
                renderSearchResults()
            }
            break
        }
        case 'Enter':
            e.preventDefault()
            toggleSearchResult(searchState.activeIndex)
            break
        case 'Escape':
            closeSearch()
            break
    }
})

const searchResults = mustGetElementById('study-search-results')

// mousedown, not click: blur would close the dropdown before a click lands
searchResults.addEventListener('mousedown', (e) => {
    const row = e.target.closest('.study-search-result')
    e.preventDefault()

    if (row) {
        toggleSearchResult(Number(row.dataset.index))
    }
})

searchResults.addEventListener('mouseover', (e) => {
    const row   = e.target.closest('.study-search-result:not(.disabled)')
    const index = row ? Number(row.dataset.index) : -1

    if (index !== -1 && index !== searchState.activeIndex) {
        searchState.activeIndex = index
        renderSearchResults()
    }
})

// Canvas defaults so existing calls work; redrawSync passes it in
const drawAllQuestionMarks = (canvas = document.getElementById('study-canvas')) => {
    const { scale, fontSize, wrongDrop, dropTarget } = studyState

    for (const id in studyState.coordinates) {
        const coordinates = studyState.coordinates[id]

        if (studyState.correctTags[id]) {
            drawNewText(canvas, coordinates['name'], coordinates, scale, fontSize)
        } else if (wrongDrop?.key === id) {
            const shifted = { x: parseFloat(coordinates['x']) + wrongDrop.offsetX, y: coordinates['y'] }
            drawNewText(canvas, '?', shifted, scale, fontSize, TAG_COLORS.INCORRECT)
        } else if (dropTarget === id) {
            drawNewText(canvas, '?', coordinates, scale, fontSize, TAG_COLORS.DROP_TARGET)
        } else {
            drawNewQuestionMark(canvas, coordinates, scale, fontSize)
        }
    }
}

const setupWordBank = () => {
    const wordbank = document.getElementById('study-wordbank')
    const wrap     = document.getElementById('study-wordbank-wrap')
    wordbank.replaceChildren()

    const useWordBank = studyState.difficulty < DIFFICULTY.HARD
    wrap.style.display = useWordBank ? 'block' : 'none'

    if (!useWordBank) {
        return
    }

    // Shuffled so the order doesn't give away where each word goes
    for (const id of shuffle(Object.keys(studyState.coordinates))) {
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
    const studyHintProgress     = document.getElementById('study-tags-hint')
    const studyHintBtn = document.getElementById('study-hint-btn')
    const useHints = studyState.difficulty === DIFFICULTY.EASY
    studyHintBtn.disabled  = !useHints || studyState.hintsRemaining <= 0
    studyHintProgress.textContent = useHints
        ? `${studyState.hintsRemaining} hints left`
        : 'No hints available'
}

mustGetElementById('study-hint-btn').addEventListener('click', () => {
    const answer  = Object.values(studyState.answerTag)[0]

    if (!answer) {
        return
    }

    studyState.hintText = answer.substring(0, studyState.hintText.length + 1)
    studyState.hintsRemaining--
    updateHintButton()
    window.api.popup(`Hint: word starts with "${studyState.hintText}"`)
        .catch(err => console.error(err))
})

// Label drawn for each tag, so hit areas match the pills on screen
const studyLabel = (tag, id) => studyState.correctTags[id] ? tag['name'] : '?'

// Unanswered tag under an image-space point, or null
const hitUnansweredTag = (point) => {
    const canvas = document.getElementById('study-canvas')
    const key    = checkCoordinatesExist(canvas, point.x, point.y, studyState.coordinates,
        studyState.scale, studyState.fontSize, studyLabel)

    return key && !studyState.correctTags[key] ? key : null
}

// Click on canvas to answer a tag
mustGetElementById('study-canvas').addEventListener('click', async (e) => {
    const key = hitUnansweredTag(getClickCoordinates(e, studyState.scale))

    if (key) {
        try {
            await openStudyAnswerModal(key)
        } catch (err) {
            console.error(err)
        }
    }
})

const studyAnswerModal = new bootstrap.Modal(mustGetElementById('study-answer-modal'))

const openStudyAnswerModal = async (tagId) => {
    const tag       = studyState.coordinates[tagId]
    const categoryId = tag['category']
    let prompt      = 'What is this?'

    if (categoryId) {
        const category = await window.api.getCategoryById(categoryId)

        if (category?.name) {
            prompt = `What is this ${category.name}?`
        }
    }

    studyState.answerTag = { [tagId]: tag['name'] }
    studyState.hintText  = ''
    document.getElementById('study-answer-modal-label').textContent = prompt
    document.getElementById('study-answer-input').value = ''
    studyAnswerModal.show()
}

const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]]
    }

    return arr
}

// Checks text against the tag's name and, if it's right, records it and
// redraws. Returns whether it was right; feedback is up to the caller.
const submitAnswer = (tagId, text) => {
    const answer = studyState.coordinates[tagId]['name']

    if (text.trim().toLowerCase() !== answer.toLowerCase()) {
        return false
    }

    studyState.correctTags[tagId] = answer
    updateTagsProgress()
    updateWordBank()
    redrawStudy()

    return true
}

const redrawStudy = () => {
    const canvas = document.getElementById('study-canvas')
    const image  = document.getElementById('study-image')
    redrawSync(canvas, image, drawAllQuestionMarks, studyState.scale)
}

mustGetElementById('study-answer-submit-btn').addEventListener('click', async () => {
    const txt = document.getElementById('study-answer-input').value.trim()

    if (!txt) {
        return
    }

    const tagId = Object.keys(studyState.answerTag)[0]

    if (submitAnswer(tagId, txt)) {
        studyAnswerModal.hide()
        await window.api.popup('Correct!')
    } else {
        await window.api.popup('Not quite — try again.')
    }
})

// Flashes the '?' red and shakes it. A newer wrong drop or a body part
// change replaces studyState.wrongDrop, which stops this one.
const shakeWrongDrop = async (key) => {
    const shake = { key, offsetX: 0 }
    studyState.wrongDrop = shake

    await animateFrames(SHAKE_DURATION, (progress) => {
        if (studyState.wrongDrop !== shake) {
            return false
        }

        shake.offsetX = shakeOffset(progress, studyState.scale)
        redrawStudy()
    })

    if (studyState.wrongDrop === shake) {
        studyState.wrongDrop = null
        redrawStudy()
    }
}

// Drag a word bank chip onto a '?' to answer it
enableDragOntoCanvas(mustGetElementById('study-wordbank'), mustGetElementById('study-canvas'), {
    selector:      '.word-chip:not(.used)',
    getScale:      () => studyState.scale,
    hitTest:       hitUnansweredTag,
    onHoverChange: (key) => {
        studyState.dropTarget = key
        redrawStudy()
    },
    onDrop: (chip, key) => {
        if (!submitAnswer(key, chip.textContent)) {
            shakeWrongDrop(key).catch(err => console.error(err))
        }
    },
})

const updateTagsProgress = () => {
    const total   = Object.keys(studyState.coordinates).length
    const correct = Object.keys(studyState.correctTags).length
    document.getElementById('study-tags-progress').textContent = `${correct} / ${total} tags labeled`
}

const isStudySessionActive = () => {
    return studyState.bodyParts.length !== 0;
}

const clearStudySession = () => {
    studyState.bodyParts = [];
}

const toggleChecklistRow = async (id, row) => {
    const toggle = row.querySelector('.study-picker-toggle')
    const isExpanded = toggle.getAttribute('aria-expanded');

    if (isExpanded === 'true') {
        collapseChecklistRow(row, toggle);
    } else {
        await expandChecklistRow(id, row, toggle)
    }
}

const collapseChecklistRow = (row, toggle) => {
    toggle.setAttribute('aria-expanded', 'false')
    row.querySelector('.js-browse-list').replaceChildren()
    row.querySelector('.js-browse').classList.add('hide')

}

const expandChecklistRow = async (id, row, toggle) => {

    const bodyPartList = row.querySelector('ul.js-browse-list');
    const bodyPartContainer = row.querySelector('.js-browse');
    const checklist = await window.api.getChecklistById(id)

    if (checklist) {
        bodyPartList.replaceChildren()
        const bodyPartMap = checklist.bodyParts || {};

        // sort by alphabetical order
        const orderedBodyPartMap = Object.fromEntries(
            Object.entries(bodyPartMap).sort(([, a], [, b]) => a['name'].localeCompare(b['name']))
        );

        for (const bodyPartId in orderedBodyPartMap) {
            const bodyPart = bodyPartMap[bodyPartId];
            const coordinatesMap = bodyPart['coordinates'] || {}
            const tagKeyList  = Object.keys(coordinatesMap);
            const  bodyPartBrowseItem = cloneTemplate(TEMPLATES.bodyPartListItem);

            bodyPartBrowseItem.dataset.checklistId   = id
            bodyPartBrowseItem.dataset.bodyPartId    = bodyPartId
            bodyPartBrowseItem.dataset.bodyPartName  = bodyPart['name']
            bodyPartBrowseItem.dataset.checklistName = checklist['name']
            bodyPartBrowseItem.querySelector('.js-bp-name').textContent = bodyPart['name']

            const checkbox    = bodyPartBrowseItem.querySelector('.js-checkbox')
            checkbox.disabled = tagKeyList.length === 0
            checkbox.checked  = bodyPartSelection.has(createSelectionKey(id, bodyPartId))

            let tagCountText = 'No tags yet';

            if (tagKeyList.length > 0) {
                tagCountText = `${tagKeyList.length} tag${tagKeyList.length > 1 ? 's' : ''}`;
            }

            bodyPartBrowseItem.querySelector('.js-tag-count').textContent = tagCountText;
            bodyPartList.appendChild(bodyPartBrowseItem);
        }

        updateSelectAll(row)
        bodyPartContainer.classList.remove('hide');
        toggle.setAttribute('aria-expanded', 'true');
    }
}

mustGetElementById('study-end-btn').addEventListener('click', async () => {
    try {
        const result = await window.api.dialogQuestion("Are you sure you want to end the current study session?")

        if (result.response === 0) {
            clearStudySession()
            await loadStudyPicker()
        }
    } catch (err) {
        console.error(err)
    }
})


export {
    isStudySessionActive,
}
