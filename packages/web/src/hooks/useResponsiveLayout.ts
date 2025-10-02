import { useTheme, useMediaQuery } from '@mui/material';
import { useMemo } from 'react';

interface ResponsiveLayoutConfig {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isSmallScreen: boolean;
  isLargeScreen: boolean;
  drawerWidth: number;
  messageListHeight: string;
  maxContentWidth: number;
  gridColumns: number;
  spacing: number;
}

const useResponsiveLayout = (): ResponsiveLayoutConfig => {
  const theme = useTheme();
  
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('xl'));

  const config = useMemo<ResponsiveLayoutConfig>(() => {
    if (isMobile) {
      return {
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        isSmallScreen,
        isLargeScreen: false,
        drawerWidth: isSmallScreen ? window.innerWidth : 320,
        messageListHeight: 'calc(100vh - 120px)',
        maxContentWidth: window.innerWidth - 32,
        gridColumns: isSmallScreen ? 1 : 2,
        spacing: isSmallScreen ? 1 : 2,
      };
    }

    if (isTablet) {
      return {
        isMobile: false,
        isTablet: true,
        isDesktop: false,
        isSmallScreen: false,
        isLargeScreen: false,
        drawerWidth: 280,
        messageListHeight: 'calc(100vh - 128px)',
        maxContentWidth: 600,
        gridColumns: 2,
        spacing: 2,
      };
    }

    return {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isSmallScreen: false,
      isLargeScreen,
      drawerWidth: 320,
      messageListHeight: 'calc(100vh - 128px)',
      maxContentWidth: isLargeScreen ? 800 : 700,
      gridColumns: isLargeScreen ? 4 : 3,
      spacing: 3,
    };
  }, [isMobile, isTablet, isDesktop, isSmallScreen, isLargeScreen]);

  return config;
};

export default useResponsiveLayout;