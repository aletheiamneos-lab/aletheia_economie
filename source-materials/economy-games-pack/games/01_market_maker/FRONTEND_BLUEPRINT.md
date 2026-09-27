# FRONTEND BLUEPRINT — Market Maker
Main scene: animated SVG supply-demand graph occupying the visual center.

Interactive elements:
- draggable Demand curve;
- draggable Supply curve;
- accessible left/right shift buttons;
- draggable equilibrium point in advanced mode;
- price prediction slider;
- quantity prediction slider;
- shortage/surplus overlay;
- price ceiling/floor line;
- animated buyer/seller market below chart;
- toggle `Graph / Market / Split view`;
- hint button;
- explanation drawer;
- restart.

Animation cues accepted from engine:
- `shift_curve`
- `move_equilibrium`

Micro-animations:
- axis labels count smoothly;
- curve ghost shows previous position;
- equilibrium leaves a dotted trace;
- shortage colors the empty shelf area;
- surplus fills warehouse stacks.

Mobile:
chart first, controls in bottom sheet, market scene collapsible.
