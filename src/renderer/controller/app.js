// Screen modules are imported for their registerScreen() side effect —
// nothing here uses their exports directly.
import './home.js'
import './library.js'
import './study.js'
import './practical.js'
import './results.js'
import './sidebar.js'

import { navigate } from './router.js'

// ── Dark mode ─────────────────────────────────────────────────────────────────

//The logo is an inline SVG whose fills read the theme variables, so flipping
//the attribute is all it takes to retheme it along with everything else.
const applyTheme = (isDark) => {
    document.documentElement.setAttribute('data-bs-theme', isDark ? 'dark' : 'light')
}

window.addEventListener('load', async () => {
    // Restore saved preference before first paint
    const savedDark = await window.api.getDarkMode()
    applyTheme(savedDark)

    // Listen for menu-triggered toggles
    window.api.onDarkModeChanged((isDark) => applyTheme(isDark))

    navigate('home')
})