# YUCG Analytics Design System

## Colors

### Brand Palette
| Name | Hex | Usage |
|------|-----|-------|
| Azure | `#4A70A9` | Primary accent, links, active states |
| Sky | `#8FABD4` | Secondary accent, lighter highlights |
| Black | `#000000` | Primary text |

### Applied As
- `--accent`: #4A70A9 (buttons, links, active nav)
- `--accent-hover`: #5a80b9
- `--accent-light`: #8FABD4
- `--accent-muted`: rgba(74, 112, 169, 0.1) (backgrounds for active states)

## Typography
- **Font**: Geist Sans (system fallback)
- **Headings**: semibold (600)
- **Body**: 14px, line-height 1.5

## Spacing
Base: 4px grid. Common values: 8, 12, 16, 24, 40px

## Radius
- Small (buttons, inputs): 6px
- Medium (cards): 8px

## Interactions
- Hover transitions: 150ms ease
- Active states use `accent-muted` background + `accent` text
