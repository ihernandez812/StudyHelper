// Page-by-page browsing for long lists, shared by the library, study and
// practical screens. Filtering happens before paginate(); the pager only
// knows how many pages there are.

import {mustQuerySelector} from "./domUtils.js"

// Page buttons kept on each side of the current one before collapsing to "…"
const NEIGHBOR_PAGE_COUNT = 1

const PAGE_GAP = 'gap'

// Slices one page out of itemList. The page is clamped, so deleting the only
// item on the last page lands on the page before instead of an empty one.
const paginate = (itemList, page, pageSize) => {
    const pageCount   = Math.max(1, Math.ceil(itemList.length / pageSize))
    const clampedPage = Math.min(Math.max(page, 1), pageCount)
    const start       = (clampedPage - 1) * pageSize

    return {
        pageItemList: itemList.slice(start, start + pageSize),
        page:         clampedPage,
        pageCount,
    }
}

// Case-insensitive "contains"; an empty query matches everything
const matchesQuery = (text, query) => {
    return text.toLowerCase().includes(query.trim().toLowerCase())
}

// "30 checklists", or "4 of 30 checklists" while a search hides some
const formatMatchCount = (matchCount, totalCount, noun) => {
    const nounText = `${noun}${totalCount !== 1 ? 's' : ''}`

    if (matchCount === totalCount) {
        return `${totalCount} ${nounText}`
    }

    return `${matchCount} of ${totalCount} ${nounText}`
}

// First, last, and the current page's neighbors, with PAGE_GAP where pages
// are skipped: page 5 of 10 → [1, gap, 4, 5, 6, gap, 10]. A gap that would
// hide a single page shows that page instead, so "1 … 3" never happens.
const getPageNumberList = (page, pageCount) => {
    const pageNumberList = []

    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
        const distance      = Math.abs(pageNumber - page)
        const isEdge        = pageNumber === 1 || pageNumber === pageCount
        const isNeighbor    = distance <= NEIGHBOR_PAGE_COUNT
        const isLoneSkipped = distance === NEIGHBOR_PAGE_COUNT + 1 &&
                              (pageNumber === 2 || pageNumber === pageCount - 1)

        if (isEdge || isNeighbor || isLoneSkipped) {
            pageNumberList.push(pageNumber)
        } else if (pageNumberList[pageNumberList.length - 1] !== PAGE_GAP) {
            pageNumberList.push(PAGE_GAP)
        }
    }

    return pageNumberList
}

const createPageElement = (pageNumber, currentPage) => {
    if (pageNumber === PAGE_GAP) {
        const gap = document.createElement('span')
        gap.className   = 'pager-gap'
        gap.textContent = '…'
        gap.setAttribute('aria-hidden', 'true')
        return gap
    }

    const button = document.createElement('button')
    button.type         = 'button'
    button.className    = 'pager-button'
    button.dataset.page = pageNumber
    button.textContent  = pageNumber
    button.setAttribute('aria-label', `Page ${pageNumber}`)

    if (pageNumber === currentPage) {
        button.setAttribute('aria-current', 'page')
    }

    return button
}

// Wires up the pager inside `container`, found by class:
//   .js-pager-previous  previous page button
//   .js-pager-pages     filled with a button per page and "…" gaps
//   .js-pager-next      next page button
// render({ page, pageCount }) redraws it, and hides `container` when there's
// only one page. onPageChange(page) fires on a click; the caller re-renders
// its list and calls render() again with the result of paginate().
const createPager = (container, { onPageChange }) => {
    const previousButton  = mustQuerySelector(container, '.js-pager-previous')
    const nextButton      = mustQuerySelector(container, '.js-pager-next')
    const pageListElement = mustQuerySelector(container, '.js-pager-pages')

    let currentPage = 1

    const render = ({ page, pageCount }) => {
        currentPage = page

        container.classList.toggle('hide', pageCount <= 1)
        previousButton.disabled = page <= 1
        nextButton.disabled     = page >= pageCount

        const pageElementList = getPageNumberList(page, pageCount)
            .map(pageNumber => createPageElement(pageNumber, page))

        pageListElement.replaceChildren(...pageElementList)
    }

    previousButton.addEventListener('click', () => onPageChange(currentPage - 1))
    nextButton.addEventListener('click', () => onPageChange(currentPage + 1))

    pageListElement.addEventListener('click', (event) => {
        const button = event.target.closest('[data-page]')

        if (!button) {
            return
        }

        const page = Number(button.dataset.page)

        if (page !== currentPage) {
            onPageChange(page)
        }
    })

    render({ page: 1, pageCount: 1 })

    return { render }
}

export {
    paginate,
    matchesQuery,
    formatMatchCount,
    createPager,
}
