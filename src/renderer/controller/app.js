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

const applyTheme = (isDark) => {
    document.documentElement.setAttribute('data-bs-theme', isDark ? 'dark' : 'light')
    const icon = document.querySelector('.sidebar-icon')
    if (icon) icon.src = isDark ? '../images/AnatoMeIconDark.png' : '../images/AnatoMeIcon.png'
}

window.addEventListener('load', async () => {
    // Restore saved preference before first paint
    const savedDark = await window.api.getDarkMode()
    applyTheme(savedDark)

    // Listen for menu-triggered toggles
    window.api.onDarkModeChanged((isDark) => applyTheme(isDark))

    navigate('home')
})