# Positive Vibes Stream Overlay

A self-contained overlay system for Twitch/YouTube featuring interactive jars, AI-powered trivia, and a grid layout for 1920x1080 scenes. Widgets communicate via `localStorage`, so opening the dashboard and overlay in the same browser keeps everything in sync without servers.

## File Map
- `stream-grid-overlay.html` – 3x3 scene grid that loads the compact widgets (1920x1080 @ 640x360 cells).
- `control-dashboard.html` – second-screen controller for raining items, clearing jars, and steering trivia.
- `connection-test.html` – quick check that `localStorage` events propagate across tabs.
- `widgets/feelings-jars*.html` – community emotion voting jars (full + compact).
- `widgets/zodiac-jars*.html` – zodiac star jars (full + compact).
- `widgets/creative-roles*.html` – creative role jars (full + compact).
- `widgets/trivia-game*.html` – AI trivia game (full + compact) using Anthropic Claude for topics/questions.

## Quick Start
1. Open `project/stream-grid-overlay.html` in Browser Source (OBS) or a 1920x1080 browser window.
2. Open `project/control-dashboard.html` in another tab/monitor. Keep both tabs in the same browser profile so `localStorage` syncs.
3. Use dashboard buttons to rain items, clear jars, and control trivia. Chat-style commands also work in any widget via `window.processChatCommand(username, message)`.
4. Use `connection-test.html` if you need to confirm storage events are firing.

## Chat Commands
- **Feelings**: `!uplifting`, `!melancholic`, `!energetic`, `!chill`, `!nostalgic`, `!dark`, `!romantic`, `!playful`, `!epic`, `!dreamy`, `!rebellious`, `!empowering`
- **Zodiac**: `!aries`, `!taurus`, `!gemini`, `!cancer`, `!leo`, `!virgo`, `!libra`, `!scorpio`, `!sagittarius`, `!capricorn`, `!aquarius`, `!pisces`
- **Creative Roles**: `!hitmaker`, `!listener`, `!author`, `!voiceartist`, `!reader`, `!artist`
- **Trivia**: `!vote 1-8` to pick a topic; `!a`/`!b`/`!c`/`!d` for answers.

## Trivia Flow (Bug Fixed)
- Topics are generated on load or when the dashboard triggers **Generate Topics**.
- **Start** is disabled until topics finish generating to prevent the race seen previously.
- Winning topic is selected from chat votes, questions are generated (with fallbacks), and host controls **Reveal** then **Next**.
- After 10 questions, a top-10 leaderboard is shown with scores tallied from correct answers.

## Widget Behavior
- All jars use flex-wrapped rows for balls/stars/orbs (no vertical stacking) and cap at 60 items, removing the oldest first.
- Colors, hover glows, and glassmorphism backgrounds are tuned for readability on dark streams.
- Compact widgets are fixed ~640x360 with no scrolling.
- LocalStorage command shape:
  ```js
  localStorage.setItem('streamCommand', JSON.stringify({
    widget: 'feelings' | 'zodiac' | 'roles' | 'trivia',
    command: 'add' | 'clear' | 'topics' | 'start' | 'vote' | 'answer' | 'reveal' | 'next',
    data: 'uplifting' | 'aries' | 'hitmaker' | number | letter,
    username: 'dashboard',
    timestamp: Date.now()
  }));
  ```

## Customization Tips
- Adjust colors/gradients inside each widget’s `<style>` block.
- Update the `feelingsList`, `zodiacList`, or `rolesList` arrays in the dashboard to change options globally.
- The `MAX_ITEMS` constants inside widgets control how many orbs persist.

## Notes
- Claude API calls are ready to go; no key configuration needed in this environment.
- If API calls fail (offline), widgets fall back to local sample topics/questions so the experience continues.
