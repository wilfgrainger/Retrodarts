# Changelog

All notable changes to Retro Darts Scorer are documented here.

## 1.11.5 (2026-11-10)

- Phones: the keypad keys now sit slightly inside the keypad frame, so the bottom row and Submit no longer touch its edge.
- Cache id `retro-darts-scorer-v158`.

## 1.11.4 (2026-11-10)

- Phones: a three-digit visit such as 180 now fits inside its box under Last 5 visits. The digits are slightly smaller and the box border thinner.
- Cache id `retro-darts-scorer-v157`.

## 1.11.3 (2026-11-10)

Remaining findings from the fourth critique.

- Match complete: More now includes Match history, so the final dialog is no longer a dead end. The final score digits are larger.
- Retro theme on phones: the throwing team's name sits on a solid red bar at every phone size, not only on short screens.
- Esc closes All visit scores when it was opened from a result, returning to that result.
- New match: if a team name is missing, the empty field takes focus. Typing to the 28-character limit says so.
- Game settings no longer shows its title twice. Empty Match history explains when matches appear.
- Cache id `retro-darts-scorer-v156`.

## 1.11.2 (2026-11-10)

From the fourth Impeccable critique.

- **Fix:** in the Retro theme the "Turn your phone upright" screen had near-black text on black. It is now yellow and white on black in every theme.
- **Fix:** on a first visit the cookie banner covered Start a match on small phones. While the banner is up, the button sits above the scoreboard preview.
- Game complete on upright phones and tablets shows one line per leg (winner, visits, checkout) instead of a clipped table. The full tables are in All visit scores.
- A 180 now flashes the scorer's total on the board as well as showing the call.
- "Start a new match?" leads with Keep playing, matching the Undo confirmation.
- Match history rows show a chevron so it is clear they open.
- Cache id `retro-darts-scorer-v155`.

## 1.11.1 (2026-11-10)

- **Fix:** keys tapped straight after Submit, while the last visit was still saving, were dropped. They now wait their turn, so a fast scorer never loses a digit.
- Reopening the app more than 30 minutes after a match finished opens the front page instead of the old Match complete dialog. The match is in Match history.
- Leg complete keeps **Undo finish** in view beside More, since a mis-keyed winning score is the common slip.
- Portrait tablets from 1000px tall (such as 768×1024) show the total above the last score, like other tablets, and label the games score.
- Cache id `retro-darts-scorer-v154`.

## 1.11.0 (2026-11-10)

From the third Impeccable critique and a full pass over every theme and screen size.

- **One card layout everywhere.** Team cards now read in the same order at every size: name, total, last score, last 5 visits, then legs and average. The away card is no longer a mirror image on tablets, and on wide screens last 5 visits sits above legs and average, as on phones.
- **Phones on their side** are asked to turn upright: there is not enough height for two scoreboards and a keypad. Tablets and computers are unaffected. In a short desktop window the team name now sits on its card.
- **End of a leg, game and match** lead with one button (Next leg, Next game, Share result). Undo finish, Download PDF and All visit scores sit behind More.
- **One-game matches** go straight from the winning dart to Match complete, skipping the Game 1 complete step.
- **Fix:** on tall portrait tablets (such as 800×1280) the team name was hidden behind the total and the total ran over Last 5 visits. These tablets now use the same side-by-side cards as other tablets, with larger keypad keys.
- Bull-up dialog: shorter instruction that no longer wraps a stray word.
- Settings: larger row labels on phones, and a chevron on rows that open another screen.
- TV page: the Waiting label is easier to read across a room.
- Docs: the README no longer says sign-in is needed; the FAQ says checkout hints are on by default, lists 401, and no longer repeats a step.
- Cache id `retro-darts-scorer-v153`.

## 1.10.2 (2026-11-10)

Slips found by comparing every theme and screen size against 1.8.5.

- **Fix:** the Undo key used the wrong typeface and was larger and wider-spaced than the other keys. No score, Undo, DEL and Submit now share one typeface, size and spacing at every screen size.
- **Fix:** on a phone held sideways the checkout hint ran over the No score key. It now wraps inside its own box.
- **Fix:** the Submit key was missing the dark edge the other keys have.
- Retro theme: the header buttons are outlined in yellow instead of plain black squares.
- On wide screens the checkout hint lines up with the label above it instead of being centred.
- Cache id `retro-darts-scorer-v152`.

## 1.10.1 (2026-11-10)

- **Fix:** the big 180 call stayed on screen after a 180, over the next team's entry box and other screens. It now disappears after 2.6 seconds as intended.
- Cache id `retro-darts-scorer-v151`.

## 1.10.0 (2026-11-10)

From the second Impeccable critique.

- **Retro's Submit is yellow with black lettering**, the one key unlike the others. It had been painted as a red number key, because the number-key style outranked Submit's own. Retro's Undo is now grey like Delete, instead of bright blue.
- **A 180 lights up like the board:** big LED "180" digits blink on a black window, with the call beside them. It covers only the score readout, never No score or Undo, and fits every screen. On narrow boxes the caption goes to screen readers only.
- **Upright tablets 1100–1199px tall** (iPad Air size): Last score moves under the total, so the remaining score grows from 88px to about 150px and fills the card.
- **Match complete leads with two choices:** Share result and New match. Download PDF, All visit scores and Undo finish are under More. The winner's games total blinks.
- **Wording:** "wins the match", "Rovers’ 45" (not "Rovers’s"), and the undo button says what it removes ("Undo 45"). On phones the typed number comes before "Leaves N". The bull-up dialog says "Tap the team that won the bull-up, then Start game 1."
- Cache id `retro-darts-scorer-v150`.

## 1.9.0 (2026-11-10)

From an Impeccable design critique.

- **The score you are entering reads at arm's length.** "Leaves 160", the checkout route and errors are now the biggest text after the digits (17px on phones, up to 22px on tablets, was 12px). On phones the HOME/AWAY SCORE label is left to screen readers, the unlit 888 hides until you type, and "Maximum score is 180" is now "Max 180", so it stays on one line.
- **Submit is bottom-right, where your thumb finishes typing, and Undo moved up beside No score**, away from the 0 key.
- **At full time Share result is the main button.** New match moved to the end of the list.
- **The match-complete results table** keeps one layout in every theme: game, legs, winner. Long team names end in "…" instead of breaking mid-word, and the legs score uses the LED dash.
- **Match complete fits short screens:** a wider dialog with three buttons to a row on laptops (1280×720), two to a row on short phones. The repeated "1 game played" line is gone.
- **Celebration:** a 180 gets a big "One hundred and eighty!", the leg result says the checkout ("121 checkout!", and a nod for a 170), and the leg winner's score blinks twice like a scoreboard (not when reduced motion is on).
- Cache id `retro-darts-scorer-v149`.

## 1.8.5 (2026-11-10)

- On tablets, desktop and full screen the team name has more room above it than below, so it reads as the card's title instead of sitting tight under the Throwing / Waiting row.
- Cache id `retro-darts-scorer-v148`.

## 1.8.4 (2026-11-10)

- **Empty score boxes show the LED's own dash** (Last score, Avg and the five recent visits), like a real scoreboard, instead of a typed long dash.
- Cache id `retro-darts-scorer-v147`.

## 1.8.3 (2026-11-10)

- **Settings has clearer sections:** Current match, Matches, Preferences and App, with headings styled like the match setup screen.
- **Phones held upright** no longer show the Cast icon in the top bar, so the logo has room. Cast to TV stays in Settings.
- Cache id `retro-darts-scorer-v146`.

## 1.8.2 (2026-11-10)

- **Cast to TV waits for nearby TVs to answer** before opening Chrome's Cast list. If no TV can show Retro Darts after 3 seconds, it says so instead of opening an empty panel.
- Cache id `retro-darts-scorer-v145`.

## 1.8.1 (2026-11-10)

- **The front page has one button: Start a match.** Sign in with Google, Match history and Cast to TV are in Settings and the top bar.
- Google's sign-in code no longer loads on the front page; it loads when you open the sign-in dialog.
- The page title says 301, 401 & 501.
- Cache id `retro-darts-scorer-v144`.

## 1.8.0 (2026-11-10)

- **Cast icon in the top bar,** next to full screen. It fills in while casting, and tapping it again stops.
- **Delete matches:** Match history has a Delete matches button. Tick the matches to remove, or Select all, then confirm once. Matches backed up to your Google Drive go from there too, as with deleting one match.
- Cache id `retro-darts-scorer-v143`.

## 1.7.0 (2026-11-10)

- **401** joins 301 and 501 as a starting score.
- **Cast to TV on the front page,** next to Match history, as well as in Settings.
- The front page, search descriptions, FAQ and llms.txt mention casting to a TV and 401. The FAQ has a new question on showing the scoreboard on the pub TV.
- Cache id `retro-darts-scorer-v142`.

## 1.6.1 (2026-11-10)

- **Cast to TV is switched on** in Chrome, with the registered Google Cast app. Until Google publishes the app, it only launches on Chromecasts registered as test devices.
- Cache id `retro-darts-scorer-v141`.

## 1.6.0 (2026-11-10)

Cast to TV, without streaming video.

- **A TV scoreboard page at `/tv/`.** A Chromecast opens it and draws the scoreboard itself, in the scorer's theme. It shows who is throwing, the scores, last score, legs, average, and who won a leg, game or match.
- **Cast to TV** in Settings sends the TV only the numbers on screen: under 1 KB per visit, where screen mirroring sends video the whole time.
- Google's Cast code loads only when Cast to TV is tapped. The app still opens and scores offline as before.
- **Not switched on yet:** Cast to TV stays hidden until the Google Cast app id is added.
- `/tv/?demo` previews the TV page in any browser.
- Cache id `retro-darts-scorer-v140`.

## 1.5.1 (2026-11-10)

The front page becomes a home screen.

- **Two buttons under Start a match:** Sign in with Google (Google Drive backup once signed in) and Match history. New features get a button in this row.
- The Google button is hidden only when Google cannot be reached.
- Cache id `retro-darts-scorer-v139`.

## 1.5.0 (2026-11-10)

The screens around the game are plainer. The scoring screen is unchanged.

- **Front page:** Start a match is always the main button. Sign in with Google is a small link under it. The tagline and the numbered steps are gone.
- **Settings is a plain list** with thin dividers, Match history first. FAQ, Privacy, Cookies and the support email are small links at the bottom. Keep matches on this device only shows when signed in.
- **Dialogs say less.** No label above the title unless it tells you something, and the explanations are shorter.
- **Match setup** is titled New match, and the portrait tip is gone.
- **One word:** the whole app says "match", not "fixture", including the result screens and the PDF.
- **Game result on a phone:** the "GAME 1 · LEGS" label no longer runs off the left edge; it sits above the legs score.
- **Switches** take each theme's colour instead of always being red, and the dividers in Settings show in the dark themes.
- A tap on the dimmed page behind Settings closes it and presses nothing underneath.
- The undo question is "Undo the last score?".
- Cache id `retro-darts-scorer-v138`.

## 1.4.8 (2026-11-09)

From a full audit. Keeps each person's matches apart on a shared tablet.

- **Matches played without signing in stay on the device.** 1.4.7 promised this, but the next person to sign in backed them up to their own Drive. They are now never backed up, including any already saved that way.
- **Checkout hints** are turned on once on devices that saved them off before 1.4.7, when off was the default.
- **Signed out, Match history shows only this device's matches,** not every Google account's that used the tablet.
- **Signing out during a backup now really stops it.** In 1.4.7 the check came after Drive's matches were already written to the device.
- **Keep matches on this device** is now a setting of the device. Someone else signing in no longer turns it back on.
- **Escape** closes Match history, Settings, Install and Google Drive dialogs.
- The privacy policy, FAQ, search descriptions and llms.txt no longer say a Google sign-in is required, and the privacy policy says what the Drive file holds.
- Tests: the once-per-session sync test now checks uploads, and new tests cover signing out mid-backup and matches played without signing in.
- Cache id `retro-darts-scorer-v137`.

## 1.4.7 (2026-11-08)

From playing a few matches as a casual user.

- **Play without signing in.** Online, the front page offers Play without signing in next to Sign in with Google. Matches are kept on this device only.
- **Phones show who is throwing.** The thrower's name gets a ▶ mark, like the tablet's THROWING NOW. The waiting team no longer shows a dot that looked like an active marker.
- **Shorter default match:** first to 1 game, best of 3 legs. The app still remembers the last setup.
- **Checkout hints are on by default.** They can be turned off in Settings.
- **Undo names the visit it removes,** for example "This removes Wheatsheaf's 60". The confirmation stays, because Undo sits next to the 0 key.
- The final result table shows the winning team's name instead of HOME or AWAY.
- **Shared tablets:** deleting another Google account's match, while signed out, says it is deleted on this device only, and that account's Drive copy is kept. Each account's unsynced deletions are kept for it when someone else signs in. A new account no longer inherits the last account's default match. A sync that is still running when someone signs out writes nothing more.
- "Update ready" no longer appears on the first load after a release, when the page is already new.
- Cache id `retro-darts-scorer-v136`.

## 1.4.6 (2026-11-08)

Two fixes for changes in 1.4.5, and two for shared tablets.

- **Shared tablets: backup checks the Google account.** When Google renews access, the app checks the returned account is the one signed in here. If someone picked a different account in Google's window, nothing is backed up and the backup stays waiting.
- **Shared tablets: deleting another account's match stays on this device.** Someone signed out (or signed in as someone else) who deletes a match owned by another Google account removes it from this device only, not from that account's Drive.
- **Full screen on Start match works again for signed-in players.** Starting a match with the same teams and rules no longer marks a backup as waiting, so the first tap after reopening the app goes full screen instead of opening Google's sign-in window.
- **Old links work offline again:** `/index.html` and `/standalone.html` open the saved scorer with no signal.
- Cache id `retro-darts-scorer-v135`.

## 1.4.5 (2026-11-08)

Fixes from a second full review.

- **Shared tablets:** a match finished while signed in now belongs to that Google account, so it is never backed up to the next person who signs in.
- **Cookie banner:** the keyboard focus outline is visible in every theme (it was black on black in Retro).
- **Offline:** the FAQ, privacy and not-found pages no longer open the scorer when there is no signal; only the scorer works offline.
- **First match after reopening the app:** Start match asks for Google's sign-in window or full screen, never both in one tap.
- The fixture result reads the same everywhere ("X win the fixture") on Share, the PDF and the final dialog.
- An undone result whose removal failed is cleared when a new match starts.
- Android gets a maskable app icon; the home link on the static pages is 44px tall; the header logo is no longer read out twice.
- Faster typing: the big totals are no longer re-measured on every key tap.
- Checks: the changelog, the security policy (CSP), the published-file list, offline start after an update and the scoring fuzz test are now covered; CI also runs on main.
- Cache id `retro-darts-scorer-v134`.

## 1.4.4 (2026-11-08)

- **Big score totals stay one size.** They are sized for the widest score ("888"), so the digits no longer grow or shrink as the score changes.
- **The landing bounce plays once, when a score is submitted.** Typing the next score no longer restarts it.
- **Classical Pub has its old Pub Oche colours back:** chalkboard panels, brass trim, pub-green keys and red LED digits, on the scorer and the FAQ, privacy and not-found pages.
- Cache id `retro-darts-scorer-v133`.

## 1.4.3 (2026-11-07)

Fixes from a line-by-line review.

- **Sign-in:** the front screen offers Start a match only while signed in with Google. Signed out, it offers Sign in with Google. With no signal, or when Google cannot be reached, scoring still opens.
- **Undo finish** works after a failed history save, and the undone result is removed from history even if the first save after the undo failed.
- A saved match that cannot be opened no longer locks the device: two taps on **Discard this saved match** clear it. Match history is kept.
- Each finished match counts once in analytics; accepting analytics after rejecting it takes effect straight away.
- Signing out with **Keep matches on this device** off says the matches are in Google Drive.
- **Retro theme:** the keyboard focus outline is black on yellow surfaces, so it can be seen.
- A team named "Home" or "Away" no longer shows the HOME/AWAY badge twice on tablets and laptops.
- Tablet text sizes no longer depend on newer CSS maths, so they hold on older Safari.
- Screen readers: the setup dropdowns are named after their visible labels, and each turn is announced once with the team's name.
- PDF: a long fixture starts game 1 on a new page instead of under the footer.
- Match history: a theme chosen during a backup sticks, Load more never repeats the first page, and the list no longer folds shut after each backup.
- Unused CSS and duplicate or always-passing tests removed.
- Cache id `retro-darts-scorer-v132`.

## 1.4.2 (2026-11-07)

Fixes from a full code audit.

- **Undo finish** no longer leaves the undone result in Match history (and in Drive) next to the corrected one.
- **Keep matches on this device off:** a finished match leaves the device only once a later backup has found it in Drive, so two devices backing up at the same moment cannot lose it.
- A match deleted while a backup is running stays deleted.
- **Pub Wi-Fi with no real internet:** the app opens from the saved copy after 3 seconds instead of waiting on the network.
- **Start match** with a backup waiting asks Google first and skips full screen that once, because a tap can only open one of them.
- Unticking Google Drive on Google's consent screen now says backup needs it, instead of showing a backup that never runs.
- **Shared devices:** Match history lists only the signed-in account's matches (and unowned ones); signing out forgets the Drive list.
- **Keyboard:** Enter on a focused button (Undo, Share and others) works that button instead of scoring the typed digits.
- Sync writes each step in one database transaction; unused code removed.
- Cache id `retro-darts-scorer-v131`.

## 1.4.1 (2026-11-07)

- Short laptop windows: the HOME SCORE / AWAY SCORE label above the keypad is 12px again (it was 8px).
- Phone held sideways: the Last Score digits stay inside their box.
- Small phones: the fixture label ("BEST OF 8 GAMES") wraps onto two lines instead of running into the match score on Android-style fonts.
- Tests: the scoring screen layout checks were merged into one check per screen group, run in every theme; about 55 duplicate tests were removed.
- Cache id `retro-darts-scorer-v130`.

## 1.4.0 (2026-11-07)

Your Google account now carries your whole setup: the cog opens **Settings**, and everything in it follows you to every signed-in device.

- **Settings (the cog):** your Google account and backup status at the top; Current match (New match, Full screen) during a game; Preferences (Theme, Game settings, Keep matches on this device); Your matches (Match history, Install app); Help & privacy (FAQ, Privacy policy, Cookie settings, support). A close button and Escape close it.
- **Vibration** on or off. Keypad taps used to vibrate on Android with no way to turn it off. iPhones and iPads cannot vibrate from the web, and the setting says so there.
- **Keep matches on this device** (signed in only, on by default). Off: finished matches are removed from the device once Google Drive has confirmed the backup, which suits a shared pub tablet. Match history then lists them from Drive, newest first, and needs a connection for older ones. Turning it off asks first. The match being played always stays on the device.
- **Default match:** the teams and rules of the last match you started fill in the setup screen on any signed-in device. It can be forgotten in Settings.
- **Game settings** (a sub-menu in Settings): Checkout hints, Keep screen on, Vibration and Default match.
- **Checkout hints** (off by default): when on, the score box suggests a standard double-out finish for the throwing side from 170 down, for example `Finish T20 T20 Bull`. 159, 162, 163, 165, 166, 168 and 169 have no finish and show nothing. Only a suggestion: any total is still accepted.
- **Keep screen on** (on by default): the screen does not dim or lock while a match is on screen, using the browser's screen wake lock. Browsers without it say so in the setting.
- **Share result:** at full time and on each match in Match history, a plain-text match card (score, winner, format and date, each game's legs and winner, top checkout, top score and 180s) goes out through the phone's share sheet, for example to the team WhatsApp group. Where sharing is not available it is copied to the clipboard.
- **Match history is newest first** on every device. It used to follow each match's random id.
- Settings back up with the theme and merge on your other devices; the most recent change wins.
- Privacy policy, FAQ and README say that settings, including the two default team names, are kept in your Drive.
- **Fix: two devices making their first backup at once** could each create a backup file in Drive, and one was then ignored. Every copy is now read and merged into the oldest, and the extra copies are deleted only after that upload succeeds.
- **Fix: a change made during a backup could be left out** (a match finishing or a setting changing while a backup ran) and, after a reload, never sent. It now stays waiting and goes in a follow-up backup straight away.
- **Fix: signing in with a different Google account** on the same device sent the first account's matches, deletions and theme to the second account's Drive. Matches already backed up belong to the account that backed them up; a new account starts with its own Drive settings, and only matches never backed up to anyone go to it.
- Tests: Settings opens from the cog, vibration and the default match are saved, a new device takes settings from Drive and fills in the setup, Keep matches on this device off removes a match only after the upload and still lists it, the settings merge, Game settings, checkout hints, Share result, history order, two Drive files merging, a change during a backup, and a second Google account.

- **Fix: a Drive backup that could not be read was replaced.** If downloading the backup failed (a Google error, a dropped connection or a damaged file), the app treated it as "no backup" and uploaded this device's matches alone over it, losing matches from other devices. It now stops, keeps the backup waiting and tries again later.
- **Fix: a new device could be locked out of scoring** when Google's sign-in could not be reached while the phone still reported a connection (a content blocker, a Google outage, pub Wi-Fi with no real internet). After a failed or 8-second load, Start a match appears and sign-in is asked next time, as with no signal.
- **Clearer menu.** An account panel at the top shows whether matches are backed up, the signed-in address and the last backup (or that a backup is waiting); signed out, it says matches are not backed up. Other items are grouped under Your matches and Help & privacy.
- **Front-screen note follows the real state:** why sign-in is asked on a new device, "Signed in as …" when backing up, and "Not backed up on this device" when signed out.
- Match history says "Backed up to Google Drive" only after a backup has run, "Backup waiting" before that, and that matches are not backed up when signed out. Deleting while signed in warns that the fixture also leaves Drive and your other devices. Sign-out says whether recent matches had not backed up yet.
- Stale "no sign-up" and "needs no account" wording removed from the page descriptions, the no-JavaScript summary, the FAQ and the README.
- Tests: the account panel and note in both states, Match history wording, an unreadable Drive backup is never overwritten, and a new device can score when Google is unreachable.
- Cache id `retro-darts-scorer-v129`.

## 1.3.0 (2026-11-06)

- Sign in with Google is now required once per device. Until a device has signed in, the front screen shows Sign in with Google in place of Start a match; after one sign-in the device goes straight to scoring from then on, works offline, and is not asked again (even after signing out). Offline is never blocked: a device that has never signed in and has no signal can still score and is asked next time it is online. A match already in progress is never interrupted.
- Landing, FAQ, privacy policy, README, llms.txt, structured data and AGENTS rule updated: "No sign-up" is gone; the privacy policy explains the front-screen sign-in and its lawful basis.
- Tests: the sign-in gate appears online on a first visit, offline first visits can still score, and a device that signed in once is not asked again. Layout tests preset a signed-in device.
- Cache id `retro-darts-scorer-v128`.

## 1.2.3 (2026-11-06)

- Fix: opening the menu while signed in no longer flashes a Google sign-in window. Google's library renews an expired token through a popup that opens and closes at once; the app used to do that on every menu open. It now contacts Google only when a backup is actually waiting (sent at the next Start match) or when Match history is opened (once per session, to pull matches from your other devices), with a short "Syncing with Google Drive" message. Waiting backups are remembered across reloads. New tests count token requests with a stand-in for Google's library.
- Cache id `retro-darts-scorer-v127`.

## 1.2.2 (2026-11-06)

- FAQ: "Where is my match data stored?" now says plainly that the site has no database (nothing is saved on our side), that only finished matches back up to Google Drive, and that without signing in, clearing browser data or switching device starts empty. The offline answer explains what works with no signal, what needs a connection, and to open the app once before match night. The league example now says the app has no forfeit entry and does not offer 401.
- Landing page: a line under the steps says matches are saved on the device, with optional Google Drive backup.
- Cache id `retro-darts-scorer-v126`.

## 1.2.1 (2026-11-06)

- Wording: the Google Drive backup folder is now described as what it is, a private app folder in your own Google Drive that only Retro Darts Scorer can use, instead of a "hidden folder". The app, privacy policy and FAQ also say where to see it or delete it (Google Drive, Settings, Manage apps). Cache id `retro-darts-scorer-v125`.

## 1.2.0 (2026-11-06)

Optional Google sign-in with automatic Drive backup, and analytics with consent. Scoring is unchanged and never needs an account.

- **Sign in with Google** (menu, optional): match history and theme back up automatically to a hidden app folder in the player's own Google Drive (`drive.appdata` scope) and merge on their other devices. No buttons beyond signing in: backups run after each completed match, after deletions and theme changes, and catch up automatically when the device is back online. Matches are always saved on the device first, so offline scoring is unaffected. The access token lives in memory only; the publisher never receives the data.
- **Cookie banner and Google Analytics**: Analytics loads only after the player accepts. Reject and accept have equal weight, the choice can be changed under Cookie settings in the menu, and rejecting clears any analytics cookies. Events: match start and finish (format only), PDF download, sign-in and theme change. Team names and scores are never sent.
- Security headers allow Google's sign-in and Analytics origins only; the opener policy is `same-origin-allow-popups` so Google's sign-in window works.
- Privacy policy rewritten, FAQ gains answers on Drive backup and cookies, `llms.txt`, README, SECURITY and AGENTS updated.
- New tests: consent (no analytics before consent, Reject persists, Accept loads it, sign-in script loads only when the Drive dialog opens) and the Drive merge (union, deletions, theme recency, malformed records).
- Cache id `retro-darts-scorer-v124`.

## 1.1.1 (2026-11-05)

The scorer itself is unchanged. Only the menu entry, which is now called **FAQ**, and the page behind it.

- The guide page is now a focused **FAQ** at `/faq/` (the old `/guide/` address redirects there). It answers how the scorer fits generic pub and league rules: fixture formats such as a best of 9 or first to 5 games night, who throws first, bust rules, why it never shows checkouts, what it does not check (double in and double out), how the average is worked out, and a worked example against the published Shrewsbury and District Darts League rules (linked, and marked as not an endorsement).
- The FAQ, privacy and not-found pages now use the scorer's Retro look (Barlow Condensed, black bars, LED digits) and follow the player's chosen theme (Retro, Retro Black, Modern, Classical Pub).
- Content-Security-Policy now also allows same-origin stylesheets and fonts for those pages; scripts are still limited to hashed inline code.
- Cache id `retro-darts-scorer-v123`.

## 1.1.0 (2026-11-05)

Search and AI discovery. No change to scoring or the scoreboard.

- New "How it works & FAQ" page at `/guide/` (also linked from the menu): quick start, formats, scoring and bust rules, averages, the PDF report, offline use and ten FAQs, with FAQ, breadcrumb and web-page structured data that matches the visible text.
- Better search snippets: a keyword-rich title and description, a robots meta, `en_GB` locale, and WebApplication and WebSite structured data (free, features, no invented ratings).
- A crawlable no-JavaScript summary for clients that do not run scripts.
- `sitemap.xml`, `llms.txt` (a plain-language summary for AI assistants) and a `robots.txt` that names the sitemap and welcomes search and AI crawlers.
- Unknown URLs now return a real 404 page instead of the app with a 200 (stops "soft 404" reports in Search Console).
- New `tests/seo.cjs` invariants: titles and descriptions, canonicals, structured data parses and matches the app version, FAQ markup equals the visible FAQ, sitemap lists exactly the real pages, llms.txt links resolve.
- Cache id `retro-darts-scorer-v122`.

## 1.0.3 (2026-11-05)

- Fix: when a score is entered, only the total that just changed does the small landing bounce. Since 0.4.5 both totals bounced from the second visit on, because the bounce marker was never cleared and the score-fitting step replayed it on the idle card. The marker now clears when the animation ends, and a new test checks the other total stays still.
- Fix: 1.0.2's CSS clean-up wrongly removed the landing-bounce animation and two button/card transitions (the check that found removable rules had run with reduced motion switched on, where the "no animation" rules always won). They are restored and animation and transition declarations are now excluded from clean-ups. 1.0.2's other 1,119 removals stand. Cache id `retro-darts-scorer-v121`.

## 1.0.2 (2026-11-05)

No visible change. Removed 1,122 CSS declarations that Chrome reports never take effect on any element on any of the app's screens, in any theme or window size the tests use (they were always overridden by another rule): `index.html` is about 37 KB smaller. Found by asking the browser which declaration wins each property on every element across 34 window sizes x 4 themes x about a dozen screens, then keeping only deletions where the winning declaration is in a different rule, uses no newer-browser feature and is not inside `@supports` or `@container`. Cache id `retro-darts-scorer-v120`.

## 1.0.1 (2026-11-05)

- No visible change: removed dead and overridden CSS (101 rules, 29,495 bytes). Dead rules were for markup that no longer exists (landing, history rows, logo parts, toggle rows, unused swatches); overridden rules were border-radius declarations that a universal rule always wins over, and earlier duplicate declarations.
- Cache id `retro-darts-scorer-v119`.

## 1.0.0 (2026-11-05)

First stable release. Three independent reviews (security, code and repository, end-to-end product) passed on 0.4.5; this release closes the items they recommended before tagging.

- Match history: every saved fixture now shows the date and time it finished, so two fixtures between the same teams can be told apart. The Download and Delete actions are full-size 44px buttons.
- Phones in portrait: long team names end in an ellipsis instead of a letter cut in half.
- PDF: the GAMES WON caption sits cleanly above its LED window instead of across its edge.
- Docs: README lists the four themes and credits Barlow Condensed; its licence file is now published with the site. SECURITY.md and the code of conduct give the support email. Privacy page theme colour matches the app. Legacy 1.1.x changelog labels are marked as pre-0.1.4 numbering so they are not mistaken for releases after 1.0.0.
- Cache id `retro-darts-scorer-v118`.

## 0.4.5 (2026-11-05)

- All four themes now share one layout, so every font size, window and button is identical between them; only the colours differ. Retro keeps its yellow, black and red (its layout-only rules were removed and its colours moved to variables), and gains the same larger totals as the other themes (about 174px on a Fire Max 11 in landscape, up from 107px).
- Fix: a FIRST TO N games fixture that goes past N games (for example first-to-2 decided in game 3) can now be exported to PDF and opened from Match history. Legs already had this fix; games did not.
- Fix: if saving a finished fixture to Match history keeps failing (storage blocked or full), you can now start a new match anyway or undo the finish, instead of being stuck in the dialog.
- Fix: the score-fit step no longer measures a total while its landing flash is scaling it, which could leave the digits a few pixels smaller than the window on phones.
- Security hardening on retrodarts.com: HSTS, a strict Content-Security-Policy (inline-script hashes are generated from index.html and checked by the test suite so they cannot drift), X-Frame-Options, Permissions-Policy and Cross-Origin-Opener-Policy. The support email is marked so Cloudflare's email obfuscation does not rewrite it. Added robots.txt and .well-known/security.txt.
- The service worker no longer precaches the README hero image (131 KB the app never showed).
- The throwing team is unmistakable again on tablets and desktops in every theme: a full-width THROWING NOW bar in the theme's accent, with ink chosen for at least 4.5:1 contrast (the shared layout had reduced it to a small chip).
- 360px phones: three-digit scores in the last-five cells no longer clip (180 showed as "18C").
- Phones: the game-complete leg table now scrolls whole rows with the "scroll for more" cue, instead of slicing a row under the fade.
- Cache id `retro-darts-scorer-v117`.

## 0.4.4 (2026-11-05)

- Sharing the link now shows a proper preview: a 1200x630 image in the Retro yellow, black and red look, with a title and description (Open Graph and Twitter cards), plus a canonical address.
- New icon set from the dartboard mark: browser-tab favicon (SVG, 32px PNG and favicon.ico), a 180px Apple touch icon, and refreshed 192px and 512px app icons.
- Cache id `retro-darts-scorer-v116`.

## 0.4.3 (2026-11-05)

- Fix: in some window widths (for example a desktop window shrunk to about 600px wide) the two remaining-score windows turned yellow instead of black, because their black background belonged to a wrapper with no box of its own. The total now paints the black itself, in every theme.
- Cache id `retro-darts-scorer-v115`.

## 0.4.2 (2026-11-05)

- Fix: after a window resize or rotation, both remaining totals are re-fitted to the smaller of their two score windows, so a wrapped team name can no longer leave a total a few pixels too big for its box.
- Cache id `retro-darts-scorer-v114`.

## 0.4.1 (2026-11-05)

- Match PDFs now look like the app: a yellow header with the dartboard mark and the RETRO DARTS wordmark, a black-bezel scoreboard with the games won shown in vector red LED digits, a black result banner, black table headers with a red edge, yellow checkout rows, and a black footer with RETRODARTS.COM and page numbers.
- Long team names shrink to fit instead of running off the page.
- Cache id `retro-darts-scorer-v113`.

## 0.4.0 (2026-11-05)

- Retro is the default theme again, rebuilt after the One Eighty hardware scorer: a flat yellow face and a black keypad console held in one thick black bezel with a light rim, on a dark case, on every screen size.
- Big bold HOME and AWAY labels, with TOTAL, LAST SCORE, LEGS and AVG captions under each LED window. All labels are dark on yellow or yellow/white on black, never grey.
- Both teams' digits are the same bright red. The throwing team gets a heavy red frame and a full-width solid red THROWING NOW bar across the top of its card (an unlit WAITING bar of the same height on the other card); there is no white card. Phones keep the bar, the big HOME/AWAY label and the TOTAL caption; the smallest phones mark the thrower's red name bar with a ▶.
- Chunky bevelled red number keys; DEL (grey), UNDO (blue) and NO SCORE (orange) are distinct; SUBMIT is solid red with a yellow ring.
- Landing page, setup, dialogs, menu and theme picker restyled in yellow, black and red; the dartboard mark sits on a black bezel plate.
- Retro has no rounded corners anywhere. The old black Retro theme is now "Retro Black". Modern, Retro Black and Classical Pub are squarer (radius 4px or less at every size) and bolder, with 3px visible frames on cards, the status band and the keypad, full-strength labels, and waiting-team digits at full theme colour (no grey or dimmed digits).
- Fixture complete: on landscape tablets, laptops and desktops the four actions sit in a 2x2 grid, so Download PDF and All visit scores are no longer cut off on the Fire.
- 844x390 phones: the bust preview no longer runs under the draft digits.
- Darts-night feedback: both teams' remaining totals are always the same size (they no longer shrink when a team name wraps or grow for two-digit scores), and totals fill more of their window.
- LAST SCORE is much bigger: on tablets, laptops and desktops it has its own full-width window (about 60% of the total's size); larger on phones too.
- Saved theme choices (Retro Black, Modern, Classical Pub) are kept; unknown saved values fall back to Retro.
- Cache id `retro-darts-scorer-v112`.

## 0.3.5 (2026-11-05)

- Bull-up buttons wrap team names only at spaces; on short landscape phones they stack one per row.
- Retro uses only the red LED palette for the throwing lamp (no amber).
- Larger landing hero on big screens.
- Includes the 0.3.1-0.3.4 polish: crafted dartboard logo, much larger phone scores, desktop and laptop layouts, themed dialogs, 320x568 and 844x390 fits, and fixes for double-tap ghost taps, first-to-N PDF export and truncated team names.
- Cache id `retro-darts-scorer-v111`.

### Round 5 details

- Game complete: "GAME n · LEGS" and the legs digits are one centred unit, with the legs dash exactly under the fixture dash. At 844x390 there is now a clear gap between the fixture digits and the legs row.
- Game complete leg tables trim to whole rows (no sliced text), keep a visible scroll cue ("Scroll for more legs and visits") and snap to legs.
- Fixture complete: the rule and GAME / LEGS / WON BY heads use the theme accent (red in Retro, brass in Pub, green in Modern); no gold outside Pub.
- Leg complete on short landscape: heading across the top, board left and a 2x2 button grid so every label sits on one line.

## 0.3.4 (2026-11-04)

Cache id: `retro-darts-scorer-v110`

- Dialogs now use the active theme's palette everywhere (stat tiles, leg banner, table rows, hairlines): charcoal and red in Retro, slate and green in Modern, oak and brass only in Classical Pub. This covers game complete, leg complete and View all visit scores.
- Game complete is wider on the Fire, laptop and desktop: scoreboard and stat tiles side by side, leg detail scrolls beneath with a fade and thin scrollbar, all four buttons on one row.
- Team names wrap only between words; stat labels ("Top checkout") are never ellipsised. New test covers both in every theme.
- Header mark is larger (up to 44px) with clearer lit/unlit segments, and the Classical Pub mark is crisp; the wordmark steps up on wide screens.
- The throwing-team frame in the match band follows the theme accent (no stray green in Retro).
- 320x568 phones: the visit strip is dropped (the header chart button still opens full history), so nothing touches a frame; long team names wrap on whole words; LEGS/AVG sit inside the card with padding. Test: no card child crosses the card box or is cut off.
- 844x390 landscape phones: the active score fills the card (about 105px digits, over 40% of the card height) with LAST SCORE and LEGS/AVG sharing one row and the visit strip beneath. Test: score font is more than twice the keypad numerals.
- The fixture dash in the header is coloured per theme (slate in Modern, red in Retro, amber in Pub) instead of the font default.
- Game complete: compact scoreboard (legs on one line), tiles stacked at right, leg tables in their own bounded scroll region. On short landscape phones the tiles sit side by side and everything but the leg tables stays visible. Fixture-complete on short landscape phones is one wide card with buttons in a row.

## 0.3.3 (2026-11-04)

Cache id: `retro-darts-scorer-v109`

- Phone scoring: the throwing team's remaining score is much larger (card chrome trimmed, team name and lamp on one row), and the fixture band no longer wraps.
- Toasts (for example a bust) cover the empty score-entry strip instead of the fixture band, and clear as soon as you start typing.
- Waiting team digits and last-five chips stay at 4.5:1 or better in Retro and Classical Pub; Classical Pub SUBMIT is amber.
- Clean flat primary buttons in every theme (legacy hard shadows removed); phone setup fits 360x640 with a sticky Start match bar.
- Landing copy no longer mentions checkouts.

## 0.3.2 (2026-11-04)

Cache id: `retro-darts-scorer-v108`

- New dartboard-and-LED logo mark, crisp at small sizes and themed in all three looks; wordmark beside it, mark only on very narrow screens.
- Desktop and laptop landscape: status band, two equal team panels and a keypad column; landing, setup and dialogs rebuilt on one type scale and spacing rhythm.
- Phones in portrait fit the cards, entry and full keypad at 360x640 with no scrolling.
- Fixed ghost taps: a double-tap on a dialog button no longer falls through to NO SCORE or VIEW ALL underneath (only taps within 48px of the closing tap are held for 450ms).
- Fixed PDF export and archived fixtures for FIRST TO N legs games that ran past N legs.
- Bull-up starter buttons show the full team name instead of truncating it.

## 0.3.0 (2026-11-04)

- New look, same retro scoreboard. Three themes:
  - **Modern** (new default): slate and green, with clean white segment digits.
  - **Retro**: red LED digits on a matte black cabinet.
  - **Classical Pub**: Dark Heritage retuned with oak, brass and amber LEDs.
  The yellow cabinet theme is retired; anyone who chose it moves to the default.
- The throwing team is a lit frame with a glowing lamp and full-brightness digits; the waiting team keeps a plain frame and dimmed digits. No more white card.
- Both teams use one LED colour per theme, so colour means "score" again.
- New header logo: an LED module showing a lit 180 over unlit segments, with a two-tone RETRO DARTS wordmark that recolours per theme.
- New landing page: headline, short pitch, a live-styled mini scoreboard in the current theme and the three steps at every size. The AI photo is retired.
- Keypad: plain numerals, one key style, and SUBMIT as the only filled key. Primary buttons everywhere use the theme's action colour; disabled buttons are a quiet dashed outline.
- A seven-segment 1 between other digits gets a narrow cell, so 161 and 301 read as one number instead of "16 1" and "30 1".
- In landscape, toasts appear in the left of the fixture band instead of over the match score.
- Dialog titles and messages are in sentence case in the new themes.
- Embed Barlow Condensed as the interface font, so tablets without Arial Narrow (such as the Fire Max 11) render labels as designed.
- Slimmer fixture band on landscape tablets and laptops.
- Cache id `retro-darts-scorer-v107`.

## 0.2.24 (2026-11-04)

- Fix keypad taps being silently dropped for 450ms after any dialog opened or closed: typing a score straight after Start game or Next leg could lose some or all of the digits. The guard against accidental double-taps now applies only inside dialogs.
- Show a bust as a lit amber BST in the last-five strip instead of a plain 0 that looked like a genuine zero.
- Dialogs now sit above the header controls and toasts, so the gear button and score toasts no longer cover View All or dialog titles.
- PDF headers label the games score and show the current game's legs, instead of a "Fixture 0 - 0" that looked wrong after a leg had been won.
- Raise every scoreboard label to at least 12px (LAST SCORE, HOME/AWAY badges, fixture and game labels, NO SCORE, DEL, Undo, entry hint).
- Tests now check invariants (no overflow, no overlap, text fits, 44px targets, 12px text, contrast, throwing team distinguishable) instead of exact colours, positions and ratios; they run in parallel (about 20s), never write into docs/, and can run against the live site.
- Cache id `retro-darts-scorer-v106`.

## 0.2.23 (2026-11-04)

- Replace the thin red dash in an empty score entry with faint unlit segment digits in the place where the typed score appears, like a real display waiting for input.
- Restore the missing space in the landing tagline on wide screens ("SCOREBOARD, READY").
- Cache id `retro-darts-scorer-v105`.

## 0.2.22 (2026-11-04)

- Put LEGS and AVG values in black digital windows, matching the remaining-score and last-score readouts in both themes.
- Stop the italic digits in the last-five-visit cells being clipped on the right on narrow phones.
- On landscape tablets and laptops (such as a Fire Max 11 on a stand by the board), stack LAST SCORE under the remaining total so the total uses the full card width: about 50% larger digits.
- Cache id `retro-darts-scorer-v104`.

## 0.2.21 (2026-11-04)

- Add a three-step "how a match works" strip to the landing page on tall portrait phones.
- Stop the HOME/AWAY badge being clipped on narrow portrait phones: the badge now wraps under THROWING NOW when there is no room.
- Trim the dead space between LAST SCORE and LAST 5 VISITS on tall portrait phones so the keypad gets the spare height.
- Add letter-spacing to the LEGS/AVG readouts so the decimal point in averages such as 3.0 stays visible.
- Dark Heritage: make SUBMIT a clear amber primary action and give the waiting team's card a more visible edge.
- Advance the app and offline cache to v0.2.21 / `retro-darts-scorer-v103`.

## 0.2.20 (2026-11-04)

- Give compact landscape phones a wider keypad column so the score-entry readout, NO SCORE and SUBMIT keep usable widths.
- Use one active/waiting language at every size: the throwing team is the bright lit card with a heavy rule, the waiting team is the base yellow with dimmed readouts.
- Briefly flash a team's remaining-score window when it changes (including Undo); disabled for reduced-motion.
- Stop repeating HOME/AWAY when a team is named HOME/AWAY, keep "GAME n · LEG n" from breaking mid-phrase, and keep last-five-visit cells inside the card on narrow portrait phones.
- Raise setup selects to 44px, lift micro-text to 11px or more, make setup placeholders visibly distinct from typed text, add a scrim behind the menu, move toasts clear of the keypad, remove the hard-coded LAST SCORE label offset where `text-box-trim` is supported, and collapse the status-strip row gap when the offline pill is hidden.
- On narrow portrait phones, put the leg format on its own line under "GAME n · LEG n" instead of wrapping mid-label, and darken the waiting team's name for contrast.
- Match the Dark Heritage setup stripes to the live team colours.
- On tall portrait phones, use the spare landing height for a larger CTA and more generous spacing.
- Advance the app and offline cache to v0.2.20 / `retro-darts-scorer-v102`.

## 0.2.19 (2026-11-04)

- Photo-first landing page, and no orientation banner on the landing screen (the portrait recommendation stays on setup).
- Raise active-player contrast, and dim the waiting team's card by surface (deeper yellow in Retro Classic, darker body tone in Dark Heritage) instead of by opacity, so its score keeps full contrast.
- Fix the result label and clean up the setup screen.
- Advance the app and offline cache to v0.2.19 / `retro-darts-scorer-v101`.

## 0.2.18 (2026-11-03)

- Restore the original DSEG digital score font and polish scorer alignment, including the history and player-stat rows and the compact score heading inside the entry window.

## 0.2.17 and 0.2.16 (2026-11-03)

- Not recorded at release time. Their review screenshots were kept in the project's earlier private repository.

## 0.2.15 (2026-11-03)

- Centre the match totals in wide landscape layouts (#71) and add Fire Max 11 viewport emulation evidence.

## 0.2.14 (2026-11-03)

- Restore a dark, bordered score window around each player's last visit in wide landscape layouts.
- Give the score-entry digits and validation preview separate space so an over-limit draft stays readable in both themes.
- Advance the app and offline cache to v0.2.14 / `retro-darts-scorer-v95`.

## 0.2.13 (candidate)

- Group each player's remaining and last score into one tighter, vertically centred unit in wide landscape layouts, reducing the empty gap between match-critical numbers.
- Limit the production theme picker to Retro Classic and Dark Heritage. Resolve previously saved Cyberpunk/Synthwave preferences to Retro Classic without changing match data.
- Advance the app and offline cache to v0.2.13 / `retro-darts-scorer-v94`.
- Capture and review the landscape result in Classic Retro and Dark Heritage at desktop and tablet sizes.

## 0.2.12 (candidate)

- Refine the shared live scorer with a clear active-team top rule, flatter keypad surfaces, and quieter digital-score glow in Dark Heritage.
- Reduce type variation in the shared header and setup labels while keeping the original DSEG score font.
- Advance the app and offline cache to v0.2.12 / `retro-darts-scorer-v93`.

## 0.2.8 (candidate)

- Enlarge the last score and other secondary readings, giving the score panels more space on landscape tablets while retaining the full keypad and five recent visits.
- Outline the active team name in its team colour, matching the throwing panel; the outline follows scoring and Undo in every theme.
- Show whose score is being entered and add header controls for game statistics, settings and fullscreen.
- Request fullscreen when a match starts where the browser allows it, and provide a labelled fullscreen control beside the menu. Scoring remains available if fullscreen is unavailable or denied.
- Correct keyboard activation of NO SCORE when a numeric score is already entered, and advance the offline cache to `retro-darts-scorer-v89`.

## 0.2.7 (candidate)

- Add a dedicated one-tap **NO SCORE** action beside the score entry and Submit button. It records a zero visit through the existing save/turn-switch/Undo path, with rapid double-tap protection. The regular `0` key remains for numeric scores.
- Improve at-distance readability on landscape Fire-class tablets and desktop: larger active turn, last score, five-visit history, game/fixture information and legs/average labels, without enlarging the already prominent remaining-score LEDs.
- Preserve the established team colours, all four themes, portrait recommendation, keypad layout, offline PWA and SDDL five-visit history.
- Add Playwright tests for zero-visit persistence and Undo, rapid tapping, standard 180 entry, tablet legibility and cross-viewport keypad geometry.
- Advance app and manifest to v0.2.7 / service-worker cache `retro-darts-scorer-v88`.


## 0.2.5 (2026-11-02)

- Size the phone portrait keypad panel to contain its five minimum-height rows, gaps and theme padding, leaving clear space beneath the last row in every theme.
- Advance app metadata and the offline cache to v0.2.5 / `retro-darts-scorer-v86`.

## 0.2.4 (2026-11-02)

- Make the shared site header, logo and burger face more compact across themes while keeping the menu's 44px touch target.
- Keep the complete keypad row visibly clear of the cabinet frame on short portrait phone screens without shrinking keypad targets.
- Pin the Cloudflare Pages build to the tested Node 22 line and keep release metadata checks active in shallow main builds.
- Advance app metadata and the offline cache to v0.2.4 / `retro-darts-scorer-v85`.

## 0.2.3 (2026-11-02)

- Refine Retro Classic team identity: Home keeps its cabinet red; Away uses warm charcoal with brass-yellow highlights instead of green. Other themes keep their own team colors.
- Advance app metadata and the offline cache to v0.2.3 / `retro-darts-scorer-v84`.

## 0.2.2 (2026-11-02)

- Use Retro Classic, the original yellow cabinet, as the default for people who have not chosen a theme; keep existing saved theme choices.
- Give every visit tile the same treatment in all themes; the separate Last Score readout continues to show the latest visit. Advance app metadata and the offline cache to v0.2.2 / `retro-darts-scorer-v83`.

## 0.2.1 (2026-11-02)

- Compact the header on phone portrait screens so the full live scorer and bottom keypad row fit in a short browser viewport; keep scores, five visible visits per side, and 44px keypad targets.
- Preserve landscape and tablet layouts, all scoring behavior, and saved theme selection; advance the app metadata and offline cache to v0.2.1 / `retro-darts-scorer-v82`.

## 0.2.0 (2026-11-02)

- Redesign the default scorer as Pub Oche, with a chalkboard palette, warm brass trim, distinct Home/Away colours, pub-green controls and readable red score LEDs.
- Keep Retro Classic (the original yellow cabinet), Cyberpunk and Synthwave available as selectable themes; save appearance separately from active and archived matches.
- Include the existing Themes menu, accessible 301/501 toggle, portrait recommendation and dedicated landscape keypad, with score entry and Submit integrated together.
- Preserve match setup, scoring, turns, Undo, visit history, local saving, offline use, reports and PDFs. Advance the app metadata and PWA cache to v0.2.0 / `retro-darts-scorer-v81`.

## 0.1.15 (pre-release changes included in 0.2.0)

- Add a Themes control with the current yellow cabinet, Cyberpunk neon and Synthwave purple/black/white palettes; save this appearance separately from active and archived matches.
- Replace the 301/501 dropdown with a keyboard-accessible radio toggle while keeping the same starting-score values and match rules.
- Apply a saved theme before first paint, keep theme choices keyboard accessible, and retain the selected palette across reloads and offline use.
- Keep the portrait-first recommendation, balanced landscape keypad, Home/Away cues, scoring rules, reports, PDFs and match history unchanged; advance the app metadata and PWA cache to v0.1.15 / `retro-darts-scorer-v80`.

## 0.1.14 (candidate)

- Integrate the visit preview and Submit action into a compact first row of the right-hand keypad, preserving all digits, Delete, Undo, and five visible visits per side.
- Keep the post-entry score preview clear of the keypad at wide desktop, tablet, portrait and short-landscape sizes; assert the rendered text bounds.
- Add persistent Home/Away colour cues with readable text labels, and recommend portrait on phone/tablet setup while keeping orientation unrestricted.
- Validate scorer layouts at phone/tablet portrait, short landscape, tablet landscape, 1280×720, 1512×900 and 1728×1117; bump the app metadata and offline cache to v0.1.14 / `retro-darts-scorer-v78`.

## 0.1.13 (candidate)

- Prevent MacBook and desktop landing-page scrolling by constraining the pub photograph to the remaining viewport height instead of allowing its intrinsic width to determine page height.
- Keep the heading, Start a Match button, offline/PDF message and original uncropped photograph together on one screen; add four desktop viewport regression tests.
- Bump the app metadata and offline cache to v0.1.13 / `retro-darts-scorer-v77`.

## 0.1.12

- Keep the site header and its single menu visible during scoring; place the full-width match score above a slimmer fixture/game strip.
- Rework short landscape so both team scores and the complete keypad fit together while retaining touch-sized controls; advance the PWA cache to `retro-darts-scorer-v76`.

## 0.1.7

- Restore original landing hero image; keep the phone portrait keypad fully visible on first paint after match start; service-worker cache `retro-darts-scorer-v70`.

## 0.1.6

- Improve Fire Max 11 portrait readability: larger remaining scores, labels, stats, and capped keypad height; wider leg/fixture dialogs and fixture results table type.
- Scale landscape and laptop team names and controls with viewport width; report dialogs use full-width leg tables.
- Clear disabled primary styling, high-contrast focus rings, header offline pill, landing layout with live app preview, and privacy page cabinet styling; service-worker cache `retro-darts-scorer-v67`.

## 0.1.5

- Add a consistent type scale for result and history dialogs (highlight cards, leg summaries, visit tables, actions).
- Show per-team highlight stats as single-line label/value rows with tabular figures; service-worker cache `retro-darts-scorer-v66`.

## 0.1.4

- Fix All visit scores summary card text contrast on phones (cream text on dark cards).
- Add report dialog scroll padding so the last leg summary row clears the footer.
- Renumber the public release version to the 0.1.x line (`0.1.4`); service-worker cache `retro-darts-scorer-v65`.

## Legacy label 1.1.3 (pre-0.1.4 numbering; not a 1.x release)

- Prior release on the legacy 1.1.x version label (superseded by 0.1.4).

## Legacy label 1.1.0 (pre-0.1.4 numbering; not a 1.x release)

- Earlier legacy release label retained for upgrade testing only.
