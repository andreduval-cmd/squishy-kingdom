# Squishy Kingdom landing page

Source workflow: [GPT-6 Astra · 10K Websites](https://github.com/Barty-Bart/gpt-6-astra-10k-websites), commit `e05e451ecd1e371536ef3c310fa273e12b98db7a`. The repository supplies `prompts/01-desktop-build.md` and `prompts/02-mobile-refinement.md`; it does not contain an installable `SKILL.md`.

## Direction

Preserve the existing crown mark, cream/plum/rose/sage identity, kingdom artwork and plush characters. The new landing page is a complete scroll story with persistent navigation, feature content, three game entry modes, save loading, help and honest FAQs. No testimonials, player counts, awards or other unverified claims are added.

The editable style tile is `landing-style.html`. Content is in `landing-content.json`; structural HTML remains in `index.html` as a complete fallback. Update the JSON and corresponding fallback HTML when changing public copy. The SVG master is `assets/kingdom-mark.svg`, preserving the existing crown geometry.

## Media decision and provenance

Higgsfield image and video tools were available and the live GPT Image 2.6 and Seedance 2.5 schemas were inspected. The user approved a ceiling of 115 credits for two opening stills and two eight-second 720p videos, in landscape and portrait. Both submitted image requests were rejected with `Requires basic plan or higher`. No generation job IDs were returned, and no new Higgsfield media was produced. Video generation was not submitted after the blocker.

The user explicitly chose **existing art + live 3D** instead. The landing story therefore uses the game's own procedural Three.js model helpers, with a separate composition for portrait viewports. It does not use a generated film, video frames, an alternate generation provider, or a video masquerading as gameplay. `assets/kingdom-dawn.png` is the earlier generated artwork and remains the poster/failure fallback; its original prompt and provenance are in `assets/ART-DIRECTION.md`.

## Visual Story

| Scene | Visual story | Website copy |
| --- | --- | --- |
| 01 — Opening | The bunny arrives outside the rounded gate, with the miniature village beyond. | Small world. Big soft spot. |
| Transition | Bunny hops along the path; opening copy exits while the scene moves. | No copy — let the motion lead. |
| 02 — Discover | A short camera glide reveals the village and collectible crystals. | Find your kind of squishy. |
| Transition | The same scene continues as the frog and star arrive. | No copy — let the motion lead. |
| 03 — Together | Friends gather beside the bunny in a final welcoming composition. | Your happy place, shared. |

Desktop story height starts at 360svh (3.6 viewport heights); the visible stage accounts for one viewport, leaving approximately 2.6 viewports of active scroll travel. Mobile uses 290svh, approximately 1.9 viewports of travel. Copy holds use progress 0–0.22, 0.39–0.65 and 0.79–1. The intervening beats let the movement lead. Scene geometry is continuous forward and backward. The page uses native scrolling in its landing container, with no wheel interception.

Portrait uses its own orthographic framing and vertical composition in the same renderer, rather than cropping a desktop video. There is one locally bundled 3D asset path, no parallel landscape/portrait frame downloads, and no decoded-image sequence cache. Reduced motion shows a composed opening with ordinary following content; the story is skippable. The preview renderer stops and releases its WebGL context when the game starts.

## Editing and publishing

Run `npm run build` after editing `src/world3d.js`. Update `landing.css` and `landing.js` for layout and scroll pacing. Run the landing and multiplayer checks, then publish through the existing Railway service on `feature/live-multiplayer`. A local file edit is not a live shared edit until it is pushed/deployed. No browser-only content editor or fake form submission is included.

## Delivery and verification

The committed renderer bundle is approximately 615 kB uncompressed, shared by the landing and game; the existing illustration is approximately 2.29 MB and is retained as the fallback. No new remote media dependency is required. The browser suite verifies desktop and 390px portrait layouts, native scroll holds and reverse transitions, squish input, menu focus and Escape, game entry, reduced motion and forced WebGL failure. Screenshots are generated under `test-results/`.
