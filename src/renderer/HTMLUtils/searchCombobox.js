// Type-to-find dropdown with ranked, highlighted results. In MULTIPLE mode a
// pick toggles a selection and clears the box (study, practical). In SINGLE
// mode a pick becomes the box's value, like a searchable <select>.

import {cloneTemplate, mustGetElementById, mustQuerySelector, compareNames} from "./domUtils.js"
import {MATCH_RANK} from "../enums/matchRank.js"
import {DIRECTION} from "../enums/direction.js"
import {COMBOBOX_MODE} from "../enums/comboboxMode.js"

// Most results shown in the dropdown before "Keep typing to narrow it down"
const RESULT_MAX = 8

// Characters that start a new word inside a name, so "brach" can match the
// second word of "Biceps brachii" or "Flexor carpi (radialis)"
const WORD_SEPARATOR_LIST = [' ', '-', '/', '(']

const RESULT_TEMPLATE = mustGetElementById('tpl-search-combobox-result')

// Returns { rank, index } for where the query matches, or null if it doesn't
const matchName = (nameLower, query) => {
    if (nameLower.startsWith(query)) {
        return { rank: MATCH_RANK.PREFIX, index: 0 }
    }

    // Start of any later word, e.g. "brach" → Biceps brachii
    for (let position = 1; position < nameLower.length; position++) {
        const isWordStart = WORD_SEPARATOR_LIST.includes(nameLower[position - 1])

        if (isWordStart && nameLower.startsWith(query, position)) {
            return { rank: MATCH_RANK.WORD_START, index: position }
        }
    }

    const index = nameLower.indexOf(query)
    return index === -1 ? null : { rank: MATCH_RANK.CONTAINS, index }
}

// Builds "Bi<mark>ceps</mark> brachii" out of text nodes, never innerHTML
const appendHighlightedName = (element, name, start, length) => {
    const mark = document.createElement('mark')
    mark.textContent = name.slice(start, start + length)

    element.replaceChildren(name.slice(0, start), mark, name.slice(start + length))
}

// Wires up the combobox inside `container`, cloned from tpl-search-combobox.
// options:
//   mode                            COMBOBOX_MODE; defaults to MULTIPLE
//   idPrefix                        unique prefix for the ids ARIA needs
//   placeholder, label, emptyText   text for the input and the no-match row
//   getName(entry)                  what's searched and highlighted
//   getMeta(entry)                  grey text after the name; also breaks name ties
//   isDisabled(entry)               greyed out and can't be picked
//   MULTIPLE only:
//     isSelected(entry)             shows the check mark
//     onToggle(entry)               a pick; the box has already cleared and closed
//   SINGLE only:
//     onSelect(entry | null)        the value changed; null when the box was cleared
//   onCreate(text)                  optional. Adds a "Create 'text'" row when nothing
//                                   matches exactly; resolves to the new entry, or
//                                   null to cancel
// Returns:
//   setEntryList(entryList)    what to search, e.g. after the screen reloads
//   reset()                    clears the box and closes the dropdown
//   refresh()                  redraws open results after the selection changed elsewhere
//   setSelectedEntry(entry)    SINGLE: sets the value without firing onSelect. Pass an
//                              entry from the last setEntryList, or null for none
const createSearchCombobox = (container, options) => {
    const { mode = COMBOBOX_MODE.MULTIPLE, idPrefix, placeholder, label, emptyText,
        getName, getMeta, isDisabled, isSelected, onToggle, onSelect, onCreate } = options

    const isSingle = mode === COMBOBOX_MODE.SINGLE

    const input             = mustQuerySelector(container, '.js-search-input')
    const dropdown          = mustQuerySelector(container, '.js-search-dropdown')
    const resultListElement = mustQuerySelector(container, '.js-search-results')
    const emptyElement      = mustQuerySelector(container, '.js-search-empty')
    const footerElement     = mustQuerySelector(container, '.js-search-footer')

    resultListElement.id     = `${idPrefix}-results`
    input.placeholder        = placeholder
    emptyElement.textContent = emptyText
    input.setAttribute('aria-label', label)
    input.setAttribute('aria-controls', resultListElement.id)
    resultListElement.setAttribute('aria-multiselectable', !isSingle)

    let searchEntryList = []   // [{ entry, nameLower }]
    let selectedEntry   = null // SINGLE only

    const searchState = {
        query:       '',
        createText:  '',   // shown as "Create 'x'" when onCreate is set and nothing matches exactly
        resultList:  [],   // ranked matches for the current query, uncapped
        rowList:     [],   // what's on screen: up to RESULT_MAX matches, then the create row
        activeIndex: -1,   // highlighted row in the dropdown, -1 for none
    }

    const isEntrySelected = (entry) => isSingle ? entry === selectedEntry : isSelected(entry)

    const isRowSelectable = (row) => Boolean(row.createText) || !isDisabled(row.entry)

    const getResultId = (index) => `${idPrefix}-result-${index}`

    const isOpen = () => !dropdown.classList.contains('hide')

    const open = () => {
        const activeRow = document.getElementById(getResultId(searchState.activeIndex))

        dropdown.classList.remove('hide')
        input.setAttribute('aria-expanded', 'true')

        if (activeRow) {
            input.setAttribute('aria-activedescendant', activeRow.id)
        } else {
            input.removeAttribute('aria-activedescendant')
        }
    }

    const close = () => {
        dropdown.classList.add('hide')
        input.setAttribute('aria-expanded', 'false')
        input.removeAttribute('aria-activedescendant')
        searchState.activeIndex = -1
    }

    const reset = () => {
        input.value       = ''
        searchState.query = ''
        close()
    }

    // Next row in `direction` that can be picked, wrapping around; -1 if none can
    const findSelectableIndex = (from, direction) => {
        const count = searchState.rowList.length

        for (let step = 1; step <= count; step++) {
            const index = ((from + direction * step) % count + count) % count

            if (isRowSelectable(searchState.rowList[index])) {
                return index
            }
        }

        return -1
    }

    const createResultRow = (entry, match) => {
        const row          = cloneTemplate(RESULT_TEMPLATE)
        const isPicked     = isEntrySelected(entry)
        const isUnpickable = isDisabled(entry)

        row.classList.toggle('selected', isPicked)
        row.classList.toggle('disabled', isUnpickable)
        row.setAttribute('aria-selected', isPicked)

        if (isUnpickable) {
            row.setAttribute('aria-disabled', 'true')
        }

        appendHighlightedName(row.querySelector('.js-name'), getName(entry), match.index, searchState.query.length)
        row.querySelector('.js-meta').textContent = getMeta(entry)

        return row
    }

    const createCreateRow = (createText) => {
        const row  = cloneTemplate(RESULT_TEMPLATE)
        const icon = row.querySelector('.search-combobox-check')

        row.classList.add('create')
        icon.classList.replace('fa-check', 'fa-plus')
        row.querySelector('.js-name').textContent = `Create "${createText}"`
        row.querySelector('.js-meta').textContent = ''

        return row
    }

    const render = () => {
        const rowElementList = searchState.rowList.map((row, index) => {
            const element = row.createText
                ? createCreateRow(row.createText)
                : createResultRow(row.entry, row.match)

            element.id            = getResultId(index)
            element.dataset.index = index
            element.classList.toggle('active', index === searchState.activeIndex)

            return element
        })

        resultListElement.replaceChildren(...rowElementList)

        const total = searchState.resultList.length
        emptyElement.classList.toggle('hide', total > 0 || Boolean(searchState.createText))
        footerElement.textContent = `Showing ${RESULT_MAX} of ${total}. Keep typing to narrow it down.`
        footerElement.classList.toggle('hide', total <= RESULT_MAX)

        open()
    }

    // SINGLE lists everything for an empty query, like a <select>: every name
    // "starts with" it. typedText defaults to what's in the box.
    const run = (typedText = input.value.trim()) => {
        const query = typedText.toLowerCase()
        searchState.query = query

        if (!query && !isSingle) {
            close()
            return
        }

        searchState.resultList = searchEntryList
            .map(({ entry, nameLower }) => ({ entry, match: matchName(nameLower, query) }))
            .filter(({ match }) => match !== null)
            .sort((first, second) =>
                first.match.rank - second.match.rank ||
                compareNames(getName(first.entry), getName(second.entry)) ||
                compareNames(getMeta(first.entry), getMeta(second.entry)))

        const hasExactMatch = searchEntryList.some(({ nameLower }) => nameLower === query)
        searchState.createText = onCreate && query && !hasExactMatch ? typedText : ''

        searchState.rowList = searchState.resultList.slice(0, RESULT_MAX)

        if (searchState.createText) {
            searchState.rowList.push({ createText: searchState.createText })
        }

        // SINGLE with an empty query starts on the current value, so Enter keeps it
        const selectedIndex = isSingle && !query
            ? searchState.rowList.findIndex(row => row.entry === selectedEntry)
            : -1

        searchState.activeIndex = selectedIndex !== -1 ? selectedIndex : findSelectableIndex(-1, DIRECTION.NEXT)
        render()
    }

    const setSelectedEntry = (entry) => {
        selectedEntry     = entry
        input.value       = entry ? getName(entry) : ''
        searchState.query = ''
        close()
    }

    const pick = (entry) => {
        if (isSingle) {
            setSelectedEntry(entry)
            onSelect(entry)
            return
        }

        reset()
        input.blur()
        onToggle(entry)
    }

    const activateRow = async (index) => {
        const row = searchState.rowList[index]

        if (!row || !isRowSelectable(row)) {
            return
        }

        if (!row.createText) {
            pick(row.entry)
            return
        }

        const createdEntry = await onCreate(row.createText)

        if (!createdEntry) {
            return
        }

        searchEntryList.push({ entry: createdEntry, nameLower: getName(createdEntry).toLowerCase() })
        pick(createdEntry)
    }

    // SINGLE: leaving the box keeps what was picked. An emptied box means
    // "none"; leftover typing that wasn't picked goes back to the value.
    const settleTypedText = () => {
        if (input.value.trim() !== '') {
            input.value = selectedEntry ? getName(selectedEntry) : ''
            return
        }

        if (selectedEntry) {
            selectedEntry = null
            onSelect(null)
        }
    }

    input.addEventListener('input', () => run())

    input.addEventListener('focus', () => {
        // SINGLE: open the full list rather than searching for the current
        // value, and select the text so typing replaces it
        if (isSingle) {
            input.select()
            run('')
        } else if (searchState.query) {
            run()
        }
    })

    input.addEventListener('blur', () => {
        close()

        if (isSingle) {
            settleTypedText()
        }
    })

    input.addEventListener('keydown', (e) => {
        if (!isOpen()) {
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
                    render()
                }
                break
            }
            case 'Enter':
                e.preventDefault()
                activateRow(searchState.activeIndex).catch(error => console.error(error))
                break
            case 'Escape':
                // Closes just the dropdown, not a modal around it
                e.stopPropagation()
                close()

                if (isSingle) {
                    settleTypedText()
                }
                break
        }
    })

    // mousedown, not click: blur would close the dropdown before the pick registers
    resultListElement.addEventListener('mousedown', (e) => {
        const row = e.target.closest('.search-combobox-result')
        e.preventDefault()

        if (row) {
            activateRow(Number(row.dataset.index)).catch(error => console.error(error))
        }
    })

    resultListElement.addEventListener('mouseover', (e) => {
        const row   = e.target.closest('.search-combobox-result:not(.disabled)')
        const index = row ? Number(row.dataset.index) : -1

        if (index !== -1 && index !== searchState.activeIndex) {
            searchState.activeIndex = index
            render()
        }
    })

    const setEntryList = (entryList) => {
        searchEntryList = entryList.map(entry => ({ entry, nameLower: getName(entry).toLowerCase() }))
    }

    const refresh = () => {
        if (isOpen()) {
            render()
        }
    }

    return { setEntryList, reset, refresh, setSelectedEntry }
}

export {
    createSearchCombobox,
}
