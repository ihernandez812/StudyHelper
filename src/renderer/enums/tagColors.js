// Pill fills for tags drawn on a canvas. Canvas can't read CSS variables,
// so these mirror the theme by hand.
const TAG_COLORS = {
    DEFAULT:     'rgba(199, 91, 122, 0.88)',  // --accent
    UNANSWERED:  'rgba(168, 128, 144, 0.88)', // --text-muted tone
    DROP_TARGET: 'rgba(139, 32, 69, 0.92)',   // --accent-text, darker than answered tags
    CORRECT:     'rgba(46, 140, 87, 0.9)',
    INCORRECT:   'rgba(196, 64, 64, 0.9)',
}

export {
    TAG_COLORS,
}
