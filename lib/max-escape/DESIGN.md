# Max Danger

## Reference and scope

The user's final reference is a black-background pixel arcade title screen:
large yellow type with red extrusion, purple mountains and masonry, green palms,
orange earth, a waterfall, diamonds, and patrolling snakes. This replaces the
previous blue console-cover proposal. The blonde girl remains the playable
character; brown-haired Max carries a guitar and trails pixel smoke.

This is an unlisted game at /max-danger. It is absent from Projects and the sitemap,
uses noindex in both HTML and HTTP headers, and is disallowed in robots.txt.
The previous /escape-from-max address redirects permanently to the new one.

## Visual contract

- #050309: black backdrop and empty space.
- #fff9c8: arcade readouts and headings.
- #ffe42e: title, diamonds, keys, and jump/start actions.
- #ff454d: title outline and urgency.
- #a75dea: distant mountains, masonry, and dash controls.
- Saturated green foliage, orange ground, blue water: actual terrain and scenery.

Press Start 2P is shipped via next/font for title and HUD. Outfit is reserved for
readable instructions. The only illustrated assets are the game's own pixel art.
There are no decorative badges, marketing sections, stock images, or fake chrome.
GSAP provides one short title entrance; reduced-motion disables it. Gameplay is
the primary motion. Pixel rendering stays sharp at every viewport.

## Gameplay contract

Three authored stages: Jungle Run, Flooded Ruins, Midnight Temple. Arrow keys or
A/D control movement; Space/W/up arrow jumps, with a second jump in mid-air;
X/Shift dashes and defeats snakes. Snakes can also be stomped for a bounce.

Each stage requires a golden key before its exit opens. Upper routes offer gems,
combo scoring, shields, coffee speed boosts, and hearts. Spikes, pits, snakes,
a timer, and Max's pursuit create pressure. Checkpoints save progress within a
stage; a cleared stage restores one chance. Fixed-step physics is independent
of refresh rate. Touch supports simultaneous directional and action presses.

Pause, automatic pause on lost window focus, optional sound, accessible controls,
and browser-local high scores remain. The existing storage key retains scores.
