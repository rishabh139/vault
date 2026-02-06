# Invio Styling Applied to Quartz

This document describes the Invio-inspired styling changes applied to the Quartz Vercel deployment.

## Changes Made

### 1. Geist Font Family

Added Geist font family (both Geist Sans and Geist Mono) to match Invio's typography:

- **Location**: `quartz/styles/themes/_index.scss`
- **Font Weights Added**:
  - Geist Sans: 400 (Regular), 500 (Medium), 600 (SemiBold), 700 (Bold)
  - Geist Mono: 400 (Regular), 500 (Medium), 600 (SemiBold)
- **CDN**: Using jsdelivr CDN for Vercel's @vercel/font-geist package
- **Font Display**: Set to `swap` for better performance

### 2. CSS Variables

Added CSS variables for consistent theming in both light and dark modes:

- **Location**: `quartz/styles/themes/_index.scss`
- **Variables Added**:
  - `--headerFont`: "Geist", system-ui, sans-serif (for h1, h2, h3)
  - `--bodyFont`: "Geist Mono", ui-monospace, monospace (for body text)
  - `--codeFont`: "Geist Mono", ui-monospace, monospace (for code blocks)
  - `--divider-color`: #e0e0e0 (light) / #363636 (dark)

### 3. Invio-Specific Styling

Added Invio design patterns to `quartz/styles/custom.scss`:

#### Component Styling

- **Sidebar**: 
  - Background: `var(--background-secondary)`
  - Font size: 14px

- **Flow List**: 
  - Flexbox layout with gap: 0.2em
  - Background: `var(--background-secondary)`
  - Border: 1px solid with divider color
  - Border radius: 5px
  - Padding: 6px

- **Callouts**: 
  - Mix-blend-mode: normal (normalized)

#### Typography

- **Body**: Font size 14px
- **UI Elements** (explorer, toc, sidebar): Font size 13px
- **Headings** (h1, h2, h3): Use `var(--headerFont)` (Geist)
- **Paragraphs**: Line height 1.6

#### Border Radius

- **Containers/Cards**: 5px
- **Pills/Tags/Badges**: 100px (fully rounded)
- **Buttons**: 5px
- **Code blocks**: 5px
- **Images/Media**: 5px

#### Interactive Elements

- **Buttons**: 
  - Border radius: 5px
  - Transition: all 0.2s ease

- **Links**: 
  - Color: `var(--secondary)`
  - Hover: `var(--tertiary)`
  - Transition: color 0.2s ease

- **Tags/Badges**: 
  - Border radius: 100px (pill-shaped)
  - Padding: 4px 12px
  - Font size: 13px

#### Form Elements

- **Inputs/Textareas/Selects**:
  - Border radius: 5px
  - Border: 1px solid divider color
  - Background: `var(--background-secondary)`

#### Spacing

- **Lists**: Padding-left 1.5em
- **List items**: Padding 2px 0

## Design Goals

The styling aims to achieve Invio's clean, modern aesthetic with:

1. **Consistent typography** using the Geist font family
2. **Harmonious spacing** with proper padding and gaps
3. **Subtle borders** using the divider color
4. **Smooth transitions** on interactive elements
5. **Rounded corners** with consistent 5px radius for most elements
6. **Pill-shaped tags** with 100px border radius

## Testing

When deployed to Vercel:
- Fonts will load from the jsdelivr CDN
- All styling will be applied in both light and dark themes
- The site should have the same visual feel as Invio's documentation

## Fallbacks

- Font fallbacks are in place: `system-ui, sans-serif` for Geist and `ui-monospace, monospace` for Geist Mono
- All custom styling is additive and doesn't break existing Quartz functionality
