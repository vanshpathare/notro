// Exact match to Color.kt in the Android app
export const colors = {
    primaryBlue: '#1A73E8',
    primaryBlueDark: '#1557B0',
    primaryBlueLight: '#E8F0FE',

    accentOrange: '#FF6B35',
    accentOrangeLight: '#FFF0EB',

    backgroundWhite: '#FAFAFA',
    surfaceWhite: '#FFFFFF',
    cardGray: '#F5F5F5',
    borderGray: '#E0E0E0',

    textPrimary: '#1A1A1A',
    textSecondary: '#666666',
    textHint: '#9E9E9E',

    successGreen: '#34A853',
    errorRed: '#EA4335',
    warningYellow: '#FBBC04',

    starGold: '#FFC107',

    // Dark theme
    darkBackground: '#121212',
    darkSurface: '#1E1E1E',
    darkCard: '#2C2C2C',
    darkOnSurfaceVariant: '#AAAAAA'
}

// Same subject-thumbnail colors as NoteCard.kt
export const subjectColors = [
    '#1A73E8', // blue
    '#34A853', // green
    '#EA4335', // red
    '#FBBC04', // yellow
    '#9C27B0', // purple
    '#FF6B35', // orange
    '#00BCD4', // cyan
    '#795548'  // brown
]

export function getSubjectColor(subject: string): string {
    const hash = subject.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    return subjectColors[Math.abs(hash) % subjectColors.length]
}