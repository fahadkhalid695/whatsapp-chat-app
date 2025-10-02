import { createTheme, ThemeOptions } from '@mui/material/styles';

// WhatsApp color palette
const whatsappColors = {
  primary: {
    main: '#00a884', // New WhatsApp green
    light: '#26d0ce',
    dark: '#005c4b',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#128c7e', // Classic WhatsApp green
    light: '#4db6ac',
    dark: '#00695c',
    contrastText: '#ffffff',
  },
  background: {
    default: '#f0f2f5', // Light gray background
    paper: '#ffffff',
    chat: '#efeae2', // Chat background
    message: {
      incoming: '#ffffff',
      outgoing: '#d9fdd3',
    },
  },
  text: {
    primary: '#111b21',
    secondary: '#667781',
    disabled: '#8696a0',
  },
  divider: '#e9edef',
  success: {
    main: '#00a884',
    light: '#26d0ce',
    dark: '#005c4b',
  },
  warning: {
    main: '#ffb74d',
    light: '#ffcc80',
    dark: '#f57c00',
  },
  error: {
    main: '#f44336',
    light: '#e57373',
    dark: '#d32f2f',
  },
  info: {
    main: '#54656f',
    light: '#8696a0',
    dark: '#3b4a54',
  },
};

// Custom shadows for depth
const customShadows = {
  card: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
  elevated: '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)',
  floating: '0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)',
  message: '0 1px 2px rgba(0,0,0,0.1)',
};

const themeOptions: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: whatsappColors.primary,
    secondary: whatsappColors.secondary,
    background: {
      default: whatsappColors.background.default,
      paper: whatsappColors.background.paper,
    },
    text: whatsappColors.text,
    divider: whatsappColors.divider,
    success: whatsappColors.success,
    warning: whatsappColors.warning,
    error: whatsappColors.error,
    info: whatsappColors.info,
  },
  typography: {
    fontFamily: [
      'Segoe UI',
      'Helvetica Neue',
      'Helvetica',
      'Lucida Grande',
      'Arial',
      'Ubuntu',
      'Cantarell',
      'Fira Sans',
      'sans-serif',
    ].join(','),
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.8125rem',
      fontWeight: 400,
      lineHeight: 1.4,
    },
    caption: {
      fontSize: '0.75rem',
      fontWeight: 400,
      lineHeight: 1.4,
      color: whatsappColors.text.secondary,
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 500,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 8,
  },
  spacing: 8,
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin',
          scrollbarColor: '#bfbfbf transparent',
          '&::-webkit-scrollbar': {
            width: 6,
            height: 6,
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#bfbfbf',
            borderRadius: 3,
            '&:hover': {
              backgroundColor: '#999',
            },
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'transparent',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: customShadows.card,
          },
        },
        contained: {
          background: `linear-gradient(135deg, ${whatsappColors.primary.main} 0%, ${whatsappColors.primary.dark} 100%)`,
          '&:hover': {
            background: `linear-gradient(135deg, ${whatsappColors.primary.dark} 0%, ${whatsappColors.primary.main} 100%)`,
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            backgroundColor: whatsappColors.background.paper,
            '&:hover fieldset': {
              borderColor: whatsappColors.primary.light,
            },
            '&.Mui-focused fieldset': {
              borderColor: whatsappColors.primary.main,
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: customShadows.card,
        },
        elevation1: {
          boxShadow: customShadows.card,
        },
        elevation2: {
          boxShadow: customShadows.elevated,
        },
        elevation3: {
          boxShadow: customShadows.floating,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: whatsappColors.primary.main,
          boxShadow: customShadows.card,
          borderRadius: 0,
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '2px 8px',
          '&:hover': {
            backgroundColor: 'rgba(0, 168, 132, 0.08)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(0, 168, 132, 0.12)',
            '&:hover': {
              backgroundColor: 'rgba(0, 168, 132, 0.16)',
            },
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '&:hover': {
            backgroundColor: 'rgba(0, 168, 132, 0.08)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          fontWeight: 500,
        },
        filled: {
          backgroundColor: whatsappColors.primary.main,
          color: whatsappColors.primary.contrastText,
          '&:hover': {
            backgroundColor: whatsappColors.primary.dark,
          },
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          backgroundColor: whatsappColors.secondary.main,
          color: whatsappColors.secondary.contrastText,
          fontWeight: 500,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          boxShadow: customShadows.floating,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: customShadows.card,
          '&:hover': {
            boxShadow: customShadows.elevated,
          },
        },
      },
    },
  },
};

export const theme = createTheme(themeOptions);

// Dark theme variant
export const darkTheme = createTheme({
  ...themeOptions,
  palette: {
    mode: 'dark',
    primary: whatsappColors.primary,
    secondary: whatsappColors.secondary,
    background: {
      default: '#0b141a',
      paper: '#202c33',
    },
    text: {
      primary: '#e9edef',
      secondary: '#8696a0',
      disabled: '#667781',
    },
    divider: '#313a42',
  },
});

export default theme;