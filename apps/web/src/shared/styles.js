export const tokens = {
  colors: {
    ink: '#141218',
    inkSoft: '#2d2835',
    paper: '#fbf8f4',
    panel: '#ffffff',
    brand: '#b8762f',
    brandSoft: '#f4e2cf',
    border: '#eadfce',
    muted: '#7e7468',
    success: '#1f7a45',
    warn: '#9c6d11',
    danger: '#b53a2d',
    sky: '#d8edf0'
  },
  ink: '#141218',
  white: '#ffffff',
  cream: '#fbf8f4',
  beigeLight: '#eadfce',
  gold: '#b8762f',
  textMuted: '#7e7468',
  textSecond: '#7e7468',
  fonts: {
    body: "'DM Sans', sans-serif",
    heading: "'Playfair Display', serif"
  },
  shadows: {
    soft: '0 10px 30px rgba(20, 18, 24, 0.08)',
    pop: '0 16px 40px rgba(20, 18, 24, 0.14)'
  },
  radius: {
    md: 12,
    lg: 18,
    xl: 24
  }
};

export const ui = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(155deg, #fbf8f4 0%, #f3ebe0 45%, #e8f2f3 100%)',
    color: tokens.colors.ink,
    fontFamily: tokens.fonts.body
  },
  card: {
    background: tokens.colors.panel,
    border: `1px solid ${tokens.colors.border}`,
    borderRadius: tokens.radius.lg,
    boxShadow: tokens.shadows.soft
  },
  button: {
    border: 'none',
    borderRadius: 12,
    cursor: 'pointer',
    fontFamily: tokens.fonts.body,
    fontWeight: 600,
    padding: '10px 14px'
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    borderRadius: 10,
    border: `1px solid ${tokens.colors.border}`,
    padding: '10px 12px',
    fontSize: 14,
    fontFamily: tokens.fonts.body,
    color: tokens.colors.ink,
    background: '#fff'
  }
};
