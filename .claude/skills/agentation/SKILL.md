---
name: agentation
description: Add Agentation visual feedback toolbar to a Next.js project for precise UI element annotation and communication with AI agents
license: MIT
metadata:
  author: mochabun
  version: "1.0.0"
---

# Agentation

Agent-agnostic visual feedback tool for AI coding agents. Enables precise UI element identification through interactive selection and CSS selector export.

## When to Apply

Use Agentation when:

- Communicating UI changes to AI agents (Claude Code, Cursor, etc.)
- Annotating specific UI elements for modification requests
- Capturing precise CSS selectors for styling tasks
- Providing visual context in GitHub issues or PRs
- Freezing animation states for accurate feedback
- Selecting multiple elements or text regions

## What Agentation Does

Agentation provides a visual toolbar in your Next.js application that allows you to:

1. **Click elements** - Automatically capture CSS selectors and hierarchy
2. **Select text** - Drag to select specific text portions
3. **Multi-select** - Click multiple elements with modifier keys
4. **Area selection** - Click-drag empty space to annotate regions
5. **Freeze animations** - Pause CSS animations to capture specific states
6. **Export markdown** - Copy machine-readable selectors for AI agents

**Output Format:**

```markdown
## UI Element Selection

**Selector**: `.header > button.theme-toggle`
**Position**: (1245px, 42px)
**Context**: Header component
**Text**: "Toggle Theme"
```

## Installation

### Step 1: Install Package

```bash
npm install agentation -D
```

**Note**: Install as dev dependency since it's only needed during development.

**Requirements**:

- React 18 or higher ✓ (project uses React 19)
- Next.js App Router ✓
- Desktop browsers only (no mobile support)

### Step 2: Add to Root Layout

In your Next.js app, add the Agentation component to your root layout:

**Location**: `src/app/layout.tsx`

```tsx
import { Agentation } from "agentation";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        {children}
        {process.env.NODE_ENV === "development" && <Agentation />}
      </body>
    </html>
  );
}
```

**Important**:

- Place Agentation as a **sibling to `{children}`**, not inside it
- Use conditional rendering to **exclude from production** builds
- The toolbar will appear in the bottom-right corner

### Step 3: Verify Installation

1. Run development server:

   ```bash
   npm run dev
   ```

2. Open application in browser
3. Look for toolbar in bottom-right corner
4. Toolbar should match your app's dark/light mode automatically

## Usage Patterns

### Pattern 1: Single Element Selection

**Use Case**: Modify a specific button or component

1. Click the element you want to modify
2. Agentation captures:
   - CSS selector: `.sidebar > button.primary`
   - Element position
   - Context (parent components)
3. Copy the exported markdown
4. Share with AI agent:

```
Please modify this button:
.sidebar > button.primary
Position: (245px, 120px)

Changes needed:
- Increase padding to 12px
- Change color to blue-600
```

### Pattern 2: Text Selection

**Use Case**: Modify specific text content

1. Click and drag to select text
2. Agentation captures:
   - Text content
   - Containing element selector
   - Text position within element
3. Export and share:

```
Update this text:
Element: .hero-section > h1
Text: "Welcome to Business Plan K"
New text: "Create Professional Business Plans"
```

### Pattern 3: Multi-Element Selection

**Use Case**: Apply changes to multiple elements

1. Hold modifier key (Cmd/Ctrl)
2. Click multiple elements
3. Agentation captures all selectors
4. Export batch selection:

```
Apply consistent styling to these elements:
- .card-grid > .card:nth-child(1)
- .card-grid > .card:nth-child(2)
- .card-grid > .card:nth-child(3)

Changes: border-radius to 12px, shadow to lg
```

### Pattern 4: Area Annotation

**Use Case**: Annotate a region without specific element

1. Click and drag over an empty area
2. Captures region coordinates
3. Export area description:

```
Add new feature in this area:
Region: (400px, 200px) to (800px, 600px)
Component: PricingSection
Feature: Add comparison table
```

### Pattern 5: Animation State Capture

**Use Case**: Provide feedback on specific animation frame

1. Click "Pause Animations" in toolbar
2. CSS animations freeze
3. Select elements in frozen state
4. Export with animation context:

```
Issue with animation at this state:
.modal-overlay (opacity: 0.5)
Expected: opacity should be 0.8
Animation: fadeIn at 50% progress
```

## Integration with Claude Code

### In GitHub Issues

When creating issues with UI changes:

```markdown
## Issue: Fix Navigation Button Styling

### Current State

Element: `.nav-container > button.menu-toggle`
Position: Top-right corner
Issue: Button is not visible on dark background

### Expected State

- Increase contrast
- Add white border
- Change icon color to white
```

### In Implementation Requests

When asking Claude Code to make changes:

```
/task-init "Please update the pricing table header"

Context:
Element: `.pricing-section > .table-header`
Current style: Blue background (#3B82F6)
Desired: Gradient background (from purple-600 to blue-600)
Reference: Use same gradient as hero section
```

### In Code Reviews

When providing visual feedback:

```
Code review comment:

The button selector `.btn-primary` at position (650px, 300px)
needs better hover state. Current hover adds shadow, but it
should also scale slightly (scale: 1.05).

Suggestion:
.btn-primary:hover {
  transform: scale(1.05);
  transition: transform 200ms ease-out;
}
```

## Best Practices

### 1. Development-Only Usage

**Always** conditionally render Agentation:

```tsx
// ✅ Correct: Only in development
{
  process.env.NODE_ENV === "development" && <Agentation />;
}

// ❌ Wrong: Always rendered
<Agentation />;
```

### 2. Placement in Component Tree

**Place at root level** (layout.tsx, \_app.tsx, or similar):

```tsx
// ✅ Correct: Root level, sibling to main content
<body>
  {children}
  {process.env.NODE_ENV === 'development' && <Agentation />}
</body>

// ❌ Wrong: Inside nested component
<main>
  <YourComponent>
    <Agentation /> {/* Will have limited access */}
  </YourComponent>
</main>
```

### 3. Selector Precision

Use the **most specific selector** that's stable:

```tsx
// ✅ Good: Uses semantic class
.pricing-table > .table-header

// ⚠️ Acceptable: Uses component-level class
.pricing-section .header

// ❌ Avoid: Uses position-based selector (fragile)
.pricing-section > div:nth-child(3)
```

### 4. Context in Exports

Always include **context** when sharing selectors:

```markdown
<!-- ✅ Good: Includes context -->

Element: .hero-section > button.cta
Component: Homepage Hero
Purpose: Primary call-to-action button

<!-- ❌ Bad: No context -->

.hero-section > button.cta
```

### 5. Combine with Screenshots

For complex UI issues, combine Agentation selectors with screenshots:

1. Use Agentation to capture selectors
2. Take screenshot showing the issue
3. Annotate screenshot with selector info
4. Share both with AI agent

## Troubleshooting

### Toolbar Not Appearing

**Symptom**: Agentation toolbar doesn't show in development

**Solutions**:

1. Check NODE_ENV is set to "development":
   ```bash
   echo $NODE_ENV  # Should output: development
   ```
2. Verify import is correct:
   ```tsx
   import { Agentation } from "agentation"; // Not 'agentation/dist'
   ```
3. Check browser console for errors
4. Ensure React version is 18+ (check package.json)

### Dark Mode Not Detecting

**Symptom**: Toolbar doesn't match app's dark/light mode

**Solutions**:

- Agentation auto-detects based on `prefers-color-scheme`
- If using custom theme system, ensure CSS media query is set:
  ```css
  @media (prefers-color-scheme: dark) {
    /* Your dark mode styles */
  }
  ```

### Selectors Not Copying

**Symptom**: Can't copy selectors to clipboard

**Solutions**:

1. Check browser permissions for clipboard access
2. Use "Copy" button in toolbar, not direct selection
3. Ensure site is served over HTTPS (clipboard API requirement)
4. In development, localhost should work without HTTPS

### Production Build Warning

**Symptom**: Agentation appears in production build

**Solutions**:

```tsx
// Add proper condition
{process.env.NODE_ENV === 'development' && <Agentation />}

// Verify build:
npm run build  // Should not include agentation in bundle
```

## Performance Considerations

- **Zero production overhead**: Conditional import means no bundle impact
- **Minimal dev overhead**: Pure CSS animations, no external dependencies
- **Lightweight**: Small package size (~10KB gzipped)
- **No runtime cost**: Only active when toolbar is opened

## Examples in This Project

### Adding New Feature to Pricing Page

```markdown
Task: Add feature comparison table

Using Agentation:

1. Select area: `.pricing-section` (500px, 400px)
2. Note nearby elements:
   - Above: `.pricing-header` - 80px spacing
   - Below: `.pricing-footer` - 60px spacing
3. Export context for Claude Code

/task-init "Add comparison table below pricing cards"

Element context from Agentation:

- Parent: .pricing-section
- Insert after: .pricing-cards (position: 500px, 800px)
- Available space: 400px height
- Match spacing: 60px top margin
```

### Fixing Styling Bug

```markdown
Issue: Button hover state broken

Using Agentation:

1. Click button: `.cta-button` at (650px, 200px)
2. Hover to see issue (animation freeze helps)
3. Copy selector
4. Create issue with exact element reference

GitHub Issue:
"Button at `.hero-section > .cta-button` has broken hover state.
Current: shadow-md
Expected: shadow-lg + scale(1.05)
Position: (650px, 200px) in Hero component"
```

## Integration with Other Skills

- **task-init**: Use Agentation selectors in task descriptions
- **commit**: Reference selectors in commit messages for clarity
- **pr**: Include Agentation exports in PR descriptions
- **issue-start**: Enhance issue descriptions with precise element references

## Resources

- [Agentation GitHub](https://github.com/benjitaylor/agentation)
- [Agentation npm](https://www.npmjs.com/package/agentation)
- [CSS Selectors Reference](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors)
- [Next.js App Router](https://nextjs.org/docs/app)

## Notes

- Agentation is **agent-agnostic** - works with any AI coding assistant
- Selectors are **machine-readable** - perfect for grep/search operations
- Export format is **markdown-compatible** - works in GitHub issues/PRs
- Toolbar is **non-intrusive** - hidden until activated
- Updates automatically when you change theme (dark/light)
