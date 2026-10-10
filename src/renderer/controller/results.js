// ── Results screen ────────────────────────────────────────────────────────────

import {registerScreen, navigate, refreshCurrentScreen} from "./router.js";
import {cloneTemplate, getActionTarget, mustGetElementById, formatPracticalDate} from "../HTMLUtils/domUtils.js"
import {AppState} from "./state.js"
import {PAGES} from "../enums/pages.js"
import {paginate, createPager, formatMatchCount} from "../HTMLUtils/pagination.js"
import {PAGE_SIZE} from "../enums/pageSize.js"
import {DATE_RANGE} from "../enums/dateRange.js"

registerScreen(PAGES.RESULTS, {
    sidebar: PAGES.RESULTS,
    load: () => loadResultsScreen(),
    topbar: { title: 'Results' },
})


const TEMPLATES = {
    resultRow: mustGetElementById('tpl-result-row'),
    pager:     mustGetElementById('tpl-pager'),
}

mustGetElementById('results-list').addEventListener('click', async (e) => {
    const target = getActionTarget(e.target, '.result-row');

    if (!target) {
        return;
    }

    const { id, date } = target.data;
    const action = target.action;

    try {
        switch (action) {
            case 'open' :
                openPracticalReview(id, date)
                break;
            case 'delete':
                await deleteResultRow(id, date);
                break;
            default:
                console.error(`Unknown action "${action}" on result row ${id}`);
        }
    } catch (err) {
        console.error(err);
    }
})

const DAY_IN_MS = 24 * 60 * 60 * 1000

// How far back each range reaches; ALL has no limit
const DATE_RANGE_DAY_COUNT = {
    [DATE_RANGE.WEEK]:  7,
    [DATE_RANGE.MONTH]: 30,
    [DATE_RANGE.YEAR]:  365,
}

// Kept across visits, so Back from a review returns to the same range and page
const resultsState = {
    practicalList: [],   // [{ id, practical }], newest first
    range:         DATE_RANGE.ALL,
    page:          1,
}

const resultsPagerMount = mustGetElementById('results-pager')
resultsPagerMount.appendChild(cloneTemplate(TEMPLATES.pager))

const resultsPager = createPager(resultsPagerMount, {
    onPageChange: (page) => {
        resultsState.page = page
        renderResultsPage()
    },
})

// Changing the range starts over from page 1
mustGetElementById('results-range-options').addEventListener('change', (e) => {
    resultsState.range = e.target.value
    resultsState.page  = 1
    renderResultsPage()
})

const isInRange = (practical, range) => {
    if (range === DATE_RANGE.ALL) {
        return true
    }

    return Date.now() - practical['takenAt'] <= DATE_RANGE_DAY_COUNT[range] * DAY_IN_MS
}

const loadResultsScreen = async () => {
    const practicals = await window.api.getPracticals()

    // Newest first, by when it was taken rather than by id order
    resultsState.practicalList = Object.keys(practicals)
        .map(id => ({ id, practical: practicals[id] }))
        .sort((first, second) => second.practical['takenAt'] - first.practical['takenAt'])

    document.querySelector(`#results-range-options input[value="${resultsState.range}"]`).checked = true
    renderResultsPage()
}

const renderResultsPage = () => {
    const { practicalList, range } = resultsState
    const matchList = practicalList.filter(({ practical }) => isInRange(practical, range))
    const { pageItemList, page, pageCount } = paginate(matchList, resultsState.page, PAGE_SIZE.LIST)

    resultsState.page = page

    const rowList = pageItemList.map(({ id, practical }) => createResultRow(id, practical))

    document.getElementById('results-list').replaceChildren(...rowList)
    resultsPager.render({ page, pageCount })

    const hasPracticals = practicalList.length > 0

    document.getElementById('results-toolbar').classList.toggle('hide', !hasPracticals)
    document.getElementById('results-empty').classList.toggle('hide', hasPracticals)
    document.getElementById('results-no-matches').classList.toggle('hide', !hasPracticals || matchList.length > 0)
    document.getElementById('results-count').textContent =
        formatMatchCount(matchList.length, practicalList.length, 'practical')
}

const createResultRow = (id, practical) => {
    const dateStr        = formatPracticalDate(practical['takenAt'])
    const totalTags     = practical['totalTags']
    const correctTags = practical['numCorrect']
    const stationCount = practical['stationCount']

    const li = cloneTemplate(TEMPLATES.resultRow)

    li.dataset.id = id
    li.dataset.date = dateStr
    li.querySelector('.js-name').textContent = dateStr
    li.querySelector('.js-meta').textContent =
        `${stationCount} station${stationCount !== 1 ? 's' : ''} · ${correctTags} correct tag${correctTags !== 1 ? 's' : ''} · ${totalTags} total tag${totalTags !== 1 ? 's' : ''}`

    return li
}

const openPracticalReview = (id, dateStr) => {
    AppState.currentPracticalId   = id
    AppState.currentPracticalDate = dateStr
    navigate(PAGES.PRACTICAL_REVIEW)
}

const deleteResultRow = async (id, dateStr) => {
    const result = await window.api.dialogQuestion(`Are you sure you want to delete the practical take on ${dateStr}?`)

    if (result.response === 0) {
        await window.api.deletePracticalById(id)
        await refreshCurrentScreen()
    }
}


mustGetElementById('results-start-practical-btn').addEventListener('click', () => {
    navigate(PAGES.PRACTICAL)
})