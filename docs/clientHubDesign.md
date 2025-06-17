# Client Hub Design

This document provides an overview of the `ClientHub` component used in the React client.

## Purpose

`ClientHub` summarises key instruction information for returning clients. It displays concise label/value pairs with icons in two rows: a primary row showing the most important fields, and a secondary row with supplementary details. Each item can reveal contextual information on hover.

## Component Structure

The component receives instruction details via props and organises them into two lists of `HubItem` objects. Each `HubItem` can define:

- `label` – optional label text
- `value` – main value or React node
- `icon` / `hoverIcon` – outline and filled icons
- `link` – optional download link
- `reveal` – content revealed on hover
- `hoverLabel` – alternate label shown while revealing
- `hideLabel` – when true, the label is only visible on hover

The hover state is tracked in React (`hovered`), allowing only one item to reveal at a time.

```tsx
const [hovered, setHovered] = useState<string | null>(null);
```

Items are rendered by `renderRow` which attaches `onMouseEnter` and `onMouseLeave` handlers. When an item is active, a `hub-item active` class is applied.

## Animated Behaviour

### Icon Transition

The icon for each item consists of an outline element and a filled variant. On hover, the outline is hidden and the filled icon is shown while smoothly scaling up from the centre:

```css
.hub-item:hover .icon-outline,
.hub-item.active .icon-outline { display: none; }
.hub-item:hover .icon-filled,
.hub-item.active .icon-filled { display: inline-flex; }
.hub-item:hover .hub-icon,
.hub-item.active .hub-icon { transform: scale(1.1); }
```

### Label/Value Roll‑up

The text area (`.hub-text`) contains two stacked spans:

- `.hub-main` – label and value normally displayed
- `.hub-reveal` – contextual details hidden below

CSS transitions translate these spans vertically to create a slot‑like roll‑up on hover:

```css
.hub-text { position: relative; overflow: hidden; height: 2.5rem; }
.hub-text > span { transition: transform 0.3s ease-in-out; }
.hub-main { transform: translateY(0); }
.hub-reveal { position: absolute; top: 0; left: 0; width: 100%; transform: translateY(100%); }
.hub-item.active .hub-main,
.hub-item:hover .hub-main { transform: translateY(-100%); }
.hub-item.active .hub-reveal,
.hub-item:hover .hub-reveal { transform: translateY(0); }
```

### CopyButton

For the Client ID reveal a small copy‑to‑clipboard button is included. The `CopyButton` component manages its own `copied` state and provides quick feedback:

```tsx
const [copied, setCopied] = useState(false);
await navigator.clipboard.writeText(text);
```

Styling keeps it subtle:

```css
.copy-btn { background: transparent; border: 1px solid var(--helix-dark-blue, #2f497d); padding: 2px 6px; border-radius: 3px; font-size: 0.75rem; }
```

## Layout Considerations

- Rows use a CSS grid (`grid-template-columns: repeat(4, 1fr)` on desktop) and collapse responsively to two and then one column at small breakpoints.
- The primary row appears as a card above a lighter secondary tray to visually separate important information.
- Each item carries a coloured left accent (`border-left: 2px solid var(--helix-cta)`).

This design ensures that essential details remain visible while additional context is quickly accessible through smooth vertical reveals.