// ── Topbar rendering ──────────────────────────────────────────────────────
// Pure builders. Takes a screen's `topbar` config plus a navigate callback —
// no registry, no imports — so the router can depend on this file without
// this file depending back.
//
// Config shape:
//   title       string, for a plain heading
//   breadcrumb  () => segments; a segment with a `screen` renders as a link
//   actions     () => buttons
//
// breadcrumb and actions are functions because they read AppState, which is
// only correct at render time, and because their handlers are declared below
// the registerScreen() call that names them.
const buildIcon = (iconClass) => {
    const icon = document.createElement('i')
    icon.className = `fas ${iconClass}`
    return icon
}

const buildTopbarTitle = (text) => {
    const heading = document.createElement('h2')
    heading.textContent = text
    return heading
}

const buildBreadcrumb = (segments, onNavigate) => {
    const nav = document.createElement('nav')
    nav.className = 'breadcrumb'

    segments.forEach((segment, index) => {
        if (index > 0) {
            const separator = document.createElement('span')
            separator.className = 'breadcrumb-sep'
            separator.appendChild(buildIcon('fa-chevron-right'))
            nav.appendChild(separator)
        }

        if (segment.screen) {
            const link = document.createElement('a')
            link.className   = 'breadcrumb-link'
            link.textContent = segment.label
            link.addEventListener('click', () => onNavigate(segment.screen))
            nav.appendChild(link)
        } else {
            const current = document.createElement('span')
            current.className   = 'breadcrumb-current'
            current.textContent = segment.label
            nav.appendChild(current)
        }
    })


    return nav
}

const buildTopbarButton = ({ label, icon, className, onClick }) => {
    const button = document.createElement('button')
    button.className = `btn ${className}`

    if (icon) {
        button.appendChild(buildIcon(icon))
        button.append(' ')
    }

    //append() takes a string and inserts it as text, so the label is never parsed as markup
    button.append(label)
    button.addEventListener('click', onClick)

    return button
}

// topbar.js — no registry, no imports, a leaf
export const renderTopbar = (topbarConfig, onNavigate) => {
    const left  = document.getElementById('topbar-left')
    const right = document.getElementById('topbar-right')

    left.replaceChildren()
    right.replaceChildren()

    if (!topbarConfig) {
        return
    }

    if (topbarConfig.breadcrumb) {
        left.appendChild(buildBreadcrumb(topbarConfig.breadcrumb(), onNavigate))
    } else if (topbarConfig.title) {
        left.appendChild(buildTopbarTitle(topbarConfig.title))
    }

    if (topbarConfig.actions) {
        topbarConfig.actions().forEach(action => right.appendChild(buildTopbarButton(action)))
    }
}