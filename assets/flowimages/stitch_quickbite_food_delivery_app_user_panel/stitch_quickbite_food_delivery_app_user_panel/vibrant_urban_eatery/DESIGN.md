---
name: Vibrant Urban Eatery
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#5b4137'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f1f1f1'
  outline: '#907065'
  outline-variant: '#e4beb1'
  surface-tint: '#a83900'
  primary: '#a83900'
  on-primary: '#ffffff'
  primary-container: '#ff5a00'
  on-primary-container: '#511700'
  inverse-primary: '#ffb59a'
  secondary: '#586062'
  on-secondary: '#ffffff'
  secondary-container: '#dae1e3'
  on-secondary-container: '#5d6466'
  tertiary: '#006b55'
  on-tertiary: '#ffffff'
  tertiary-container: '#00a584'
  on-tertiary-container: '#003126'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbcf'
  primary-fixed-dim: '#ffb59a'
  on-primary-fixed: '#380d00'
  on-primary-fixed-variant: '#802900'
  secondary-fixed: '#dde4e6'
  secondary-fixed-dim: '#c1c8ca'
  on-secondary-fixed: '#161d1f'
  on-secondary-fixed-variant: '#41484a'
  tertiary-fixed: '#6dfad2'
  tertiary-fixed-dim: '#4bddb7'
  on-tertiary-fixed: '#002018'
  on-tertiary-fixed-variant: '#005140'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  title-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  container-margin-mobile: 16px
  container-margin-desktop: 80px
  gutter: 16px
---

## Brand & Style

The design system is centered on the concept of "Instant Gratification," catering to urban professionals and busy families who prioritize speed without sacrificing quality. The aesthetic is **Corporate Modern with a Minimalist lean**, ensuring that food photography remains the hero while the UI provides a high-utility, friction-free framework.

The emotional response should be one of hunger-inducing excitement balanced by rhythmic reliability. We utilize heavy whitespace to prevent cognitive overload during the decision-making process, paired with high-energy accents that drive conversion. The interface feels "appetizing" through the use of soft-scale shadows and a warm color temperature across all neutral surfaces.

## Colors

The palette is dominated by **International Orange**, a color scientifically linked to appetite stimulation and urgency. 

- **Primary (#FF5A00):** Used for critical actions, price points, and active states.
- **Secondary (#2D3436):** A deep charcoal for high-contrast typography and iconography, ensuring legibility against white backgrounds.
- **Tertiary (#00B894):** A "Fresh Leaf" green reserved specifically for positive reinforcement: "Open Now" badges, discounts, and successful order confirmations.
- **Neutral (#F9F9F9):** A warm-tinted off-white used for section backgrounds to reduce eye strain and provide a subtle lift for pure white cards.

## Typography

This design system utilizes **Plus Jakarta Sans** for its modern, geometric construction and slightly rounded terminals, which evoke a friendly and approachable feel. 

Headlines use a bold weight with tight letter spacing to create a sense of density and importance. Body text is set with generous line heights to ensure menus remain readable even when skimmed quickly. Labels and utility text use medium-to-semibold weights to maintain visibility at small scales, such as delivery times and calorie counts.

## Layout & Spacing

The design system employs a **Fluid Grid** model based on an 8px rhythmic scale. 

- **Mobile:** A 4-column grid with 16px margins. Content cards generally span the full width to maximize food imagery.
- **Desktop:** A 12-column centered grid (max-width 1280px) with 24px gutters. 
- **Vertical Spacing:** Use `lg` (24px) spacing between distinct restaurant sections and `md` (16px) for internal card padding. 

The layout relies on "Negative Space Framing"—ensuring that every high-quality food image is surrounded by at least 16px of whitespace to prevent the UI from feeling cluttered or "cheap."

## Elevation & Depth

Hierarchy is established using **Tonal Layers** and **Ambient Shadows**. This design system avoids harsh borders in favor of soft depth:

1.  **Level 0 (Base):** The #F9F9F9 background.
2.  **Level 1 (Cards):** Pure white surfaces (#FFFFFF) with a very soft, diffused shadow (0px 4px 20px rgba(0,0,0,0.05)).
3.  **Level 2 (Interaction):** Hover states or active selections use a slightly deeper shadow (0px 8px 30px rgba(0,0,0,0.08)) to appear "lifted" toward the user.
4.  **Level 3 (Overlays):** Modals and bottom sheets use a 20% backdrop blur (glassmorphism) on the scrim to maintain the context of the restaurant list underneath.

## Shapes

The design system uses a **Rounded** (Level 2) shape language. This specific radius (8px base) balances the professional efficiency of a tool with the soft, organic nature of food.

- **Standard Buttons & Inputs:** 8px (0.5rem) corner radius.
- **Restaurant Cards:** 16px (1rem) corner radius for a friendly, modern container.
- **Category Chips:** Fully pill-shaped (2rem) to distinguish them from actionable buttons and cards.

## Components

### Location Pickers & Search
The search bar should be persistent. On mobile, it is a fixed-top element with a 1px soft-gray bottom border. The location picker sits above the search, using a "pin" icon in the Primary Orange.

### Detailed Restaurant Cards
Cards must feature a 16:9 aspect ratio image at the top. The bottom section contains:
- **Title:** `title-lg` in Secondary color.
- **Meta Row:** Delivery fee, time, and rating (using a primary-colored star).
- **Badges:** Small Green labels for "Free Delivery" or "Healthy," placed in the top-left corner of the image with a subtle background blur.

### Category Chips
Chips use a horizontal scroll. The unselected state is a white background with a light gray border; the active state switches to a Primary Orange background with white text. Icons should be 20px simplified glyphs representing food categories (e.g., a burger, a pizza slice).

### Buttons
- **Primary:** Solid Orange background, white text, bold weight.
- **Secondary:** White background, 2px Orange border, Orange text. 
- **Floating Action Button (Cart):** A pill-shaped button that follows the user, displaying the item count and total price in a high-contrast white-on-black layout.