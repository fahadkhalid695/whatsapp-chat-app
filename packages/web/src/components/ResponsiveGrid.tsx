import React from 'react';
import { Grid, GridProps, useTheme, useMediaQuery } from '@mui/material';
import useResponsiveLayout from '../hooks/useResponsiveLayout';

interface ResponsiveGridProps extends Omit<GridProps, 'container' | 'item'> {
  children: React.ReactNode;
  type: 'container' | 'item';
  mobileColumns?: number;
  tabletColumns?: number;
  desktopColumns?: number;
  autoColumns?: boolean;
}

const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  type,
  mobileColumns = 12,
  tabletColumns = 6,
  desktopColumns = 4,
  autoColumns = false,
  spacing,
  ...props
}) => {
  const { isMobile, isTablet, isDesktop, spacing: responsiveSpacing } = useResponsiveLayout();

  const getColumns = () => {
    if (autoColumns) {
      if (isMobile) return 12;
      if (isTablet) return 6;
      return 4;
    }

    if (isMobile) return mobileColumns;
    if (isTablet) return tabletColumns;
    return desktopColumns;
  };

  const getSpacing = () => {
    if (spacing !== undefined) return spacing;
    return responsiveSpacing;
  };

  if (type === 'container') {
    return (
      <Grid
        container
        spacing={getSpacing()}
        {...props}
      >
        {children}
      </Grid>
    );
  }

  return (
    <Grid
      item
      xs={12}
      sm={getColumns()}
      md={getColumns()}
      lg={getColumns()}
      {...props}
    >
      {children}
    </Grid>
  );
};

export default ResponsiveGrid;