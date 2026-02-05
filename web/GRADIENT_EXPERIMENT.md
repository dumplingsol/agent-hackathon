# 🎨 Gradient Background Experiments

Two experimental gradient backgrounds for the SolRelay frontend:

1. **Flowing Line Gradient** (CURRENT) - Canvas-based flowing ribbon animation
2. **WebGL Mesh Gradient** (BACKUP) - Stripe-style animated WebGL gradient

## Current: Flowing Line Gradient

**Settings:**
- Strands: 110 (volumetric band effect)
- Line width: 2.5px
- Spread: 400px
- Opacity: 0.9
- Flow speed: 0.6x
- Y position: 0.4
- Angle: -15°
- Bend: 0
- Motion: 0.3
- Color shift: 0.3

**Colors: Purple → Blue → Cyan gradient**
- `#9945FF` (Solana purple)
- `#8B5CF6` (Violet)
- `#6366F1` (Indigo)
- `#3B82F6` (Blue)
- `#0EA5E9` (Sky)
- `#06B6D4` (Cyan)
- `#00E5FF` (Bright cyan)

## Switch Between Gradients

**To use WebGL Mesh Gradient:**
```bash
cd /home/clawd/clawd/solmail/web
cp components/GradientBackground.webgl.tsx components/GradientBackground.tsx
```

**To use Flowing Line Gradient:**
```bash
cd /home/clawd/clawd/solmail/web
# Already active (current state)
```

---

# Original WebGL Mesh Gradient Documentation

## Current Configuration

```css
#gradient-canvas {
  --gradient-color-1: #6009e1;  /* Purple */
  --gradient-color-2: #41b9b1;  /* Teal */
  --gradient-color-3: #0f0f33;  /* Dark blue */
  --gradient-color-4: #8621ca;  /* Violet */
}
```

```javascript
gradient.amp = 60;          // Wave amplitude (low = subtle)
gradient.noiseSpeed = 9e-6; // Animation speed (low = slow/smooth)
// Mesh density: 2 (via conf.density)
```

## Files Modified

1. **`app/globals.css`** - Added gradient canvas styling and CSS variables
2. **`app/layout.tsx`** - Added GradientBackground component import and wrapper div
3. **`components/GradientBackground.tsx`** - New component (canvas + script loader)
4. **`public/gradient.js`** - WebGL gradient engine (MiniGl + Gradient class)

## Files Created (Backup)

- **`app/globals.css.backup`** - Original globals.css before gradient changes

## How to Revert

### Quick Revert (restore original styling)

```bash
cd /home/clawd/clawd/solmail/web

# Restore original globals.css
cp app/globals.css.backup app/globals.css

# Remove gradient component from layout.tsx
# Edit app/layout.tsx and remove:
#   - The GradientBackground import line
#   - The <GradientBackground /> component
#   - The <div className="content-overlay"> wrapper (keep children)

# Optionally remove added files
rm components/GradientBackground.tsx
rm public/gradient.js
rm GRADIENT_EXPERIMENT.md
```

### Manual CSS Revert

Replace the gradient section in `globals.css` with:

```css
/* Light mode body */
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #F3FAFF;
  background-image: radial-gradient(circle, rgb(16 63 90 / 58%) 1px, transparent 0);
  background-size: 20px 20px;
  color: #1a1a2e;
}

/* Dark mode body */
.dark body {
  background-color: #0d1225;
  background-image: radial-gradient(circle, rgba(255, 255, 255, 0.08) 1px, transparent 1px);
  background-size: 20px 20px;
  color: #E3E8EF;
}
```

## How to Customize

### Change Colors

Edit the CSS variables in `globals.css`:

```css
#gradient-canvas {
  --gradient-color-1: #YOUR_COLOR_1;
  --gradient-color-2: #YOUR_COLOR_2;
  --gradient-color-3: #YOUR_COLOR_3;
  --gradient-color-4: #YOUR_COLOR_4;
}
```

### Change Animation

Edit `public/gradient.js` and find these lines near the top of the Gradient class:

```javascript
e(this, "amp", 60);           // Wave amplitude (0-600)
e(this, "noiseSpeed", 9e-6);  // Animation speed (1e-6 to 20e-6)
```

### Change Mesh Density

In `public/gradient.js`, find `this.conf`:

```javascript
this.conf = {
  density: [0.02, 0.052],  // Lower = less dense (smoother)
  // ...
};
```

## Credits

This gradient implementation is based on Stripe's homepage design. The WebGL engine (MiniGl) and Gradient class were extracted and adapted for React/Next.js.

---

*This is an experiment! If it causes issues or you don't like it, just revert using the instructions above.* 🔄
