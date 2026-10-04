# Jithesh Reddy M: portfolio

A single-page portfolio with no dependencies and no build step: plain HTML, CSS and JavaScript.

## Run it

Double-click `index.html`, or serve the folder so links behave exactly as they will online:

```
npx serve .
```

## What's where

| File | What it holds |
|---|---|
| `index.html` | All page content: hero, work, skills, certifications, projects, education, contact |
| `css/styles.css` | Colours and type (the tokens at the top), layout, every animation |
| `js/widget.js` | The chat widget. Edit the `SCRIPT` object at the top to change what it says |
| `js/main.js` | Theme switch, scroll progress, timeline fill, nav indicator, reveals |
| `assets/` | Favicon, the resume PDF behind the download buttons, and the Claude certificate PDF |

## Changing things

- **Text**: edit `index.html` directly. The widget's questions and answers live in `js/widget.js`.
- **Colours**: change the tokens under `:root` in `css/styles.css`. The dark theme values are
  listed twice (once for the system setting, once for the toggle), so update both.
- **Resume**: replace `assets/Jithesh-Reddy-M-Resume.pdf` and keep the same file name.
- **Font**: IBM Plex Sans loads from Google Fonts in the `<head>` of `index.html`. To change it,
  swap that link and the `--font` token at the top of `css/styles.css`.
- **Theme**: the page follows the visitor's system theme. The switch in the header overrides it.

## Animations and where to switch them off

| Animation | Where it lives |
|---|---|
| Numbers count up (education scores, LeetCode) | `data-count` attributes in `index.html`; "Numbers count up" in `js/main.js` |
| Work points arrive line by line | "Work points arrive" in `js/main.js` and `css/styles.css` |
| Chat button floats bottom-right after the hero | "Floating launcher" in `js/widget.js` and `css/styles.css` |
| Certificate card tilts toward the cursor | `data-tilt` attribute in `index.html` |
| Copy button turns into a tick | `.copy` rules in `css/styles.css` |

Removing the attribute (or the marked block) switches that animation off without affecting the rest.

## Deploy

The folder is the site. Push it to a GitHub repository and turn on GitHub Pages, or connect the
repository to Cloudflare Pages, Netlify or Vercel with no build command and the output
directory set to the project root.

## Notes

- Animations switch off for visitors who have "reduce motion" enabled.
- The phone number appears in the contact section, the chat widget and the resume PDF.
