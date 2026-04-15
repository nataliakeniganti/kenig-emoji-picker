# Kenig Emoji Picker

Note: Created by AI agent. A high-performance, professional-grade emoji picker featuring **1,949+ emojis**, multi-set support (Twemoji, Google, OpenMoji, Native), and a robust settings panel. Built with a strict "Sharp UI" aesthetic.

<div align="center">
  <img width="45%" alt="light theme" src="https://raw.githubusercontent.com/nataliakeniganti/kenig-emoji-picker/main/images/screenshot_light.png" /> 
  <img width="45%" alt="dark theme" src="https://raw.githubusercontent.com/nataliakeniganti/kenig-emoji-picker/main/images/screenshot_dark.png" />
</div>

## 🚀 Features

-   **Latest Unicode Support**: Includes all emojis up to v17.0 (Phoenix, Lime, Face with Bags Under Eyes, etc.).
-   **Multi-Set Integration**: Toggle between:
    -   **Twemoji**: The signature Twitter emoji style (SVG/PNG).
    -   **Native**: Uses the user's OS emoji font (Apple, Windows, Android).
    -   **OpenMoji**: High-quality 72x72 PNGs from the OpenMoji project.
    -   **Google Noto**: Standard Google color emoji set.
-   **Global Skin Tone Modifier**: Change the skin tone for all applicable emojis across the entire picker.
-   **Frequently Used**: Smart tracking of your most used emojis, persisted via `localStorage`.
-   **Sharp UI Design**: Rigid, unrounded edges (`border-radius: 0`) for a modern professional look.
-   **Variable Icons**: Uses Material Symbols Outlined with variable font axes to toggle between Filled and Outlined states.
-   **Advanced Search**: Filters by official labels and hidden metadata tags (e.g., searching "bark" finds 🐕).

## 🛠️ Settings Panel

The integrated settings panel on the right allows for deep customization:
-   **Set Switcher**: Live toggle between Native, Twemoji, Google, and OpenMoji.
-   **Icon Style**: Switch between Outlined and Filled Material Symbols.
-   **Nav Position**: Move the category bar between the **Top** and **Bottom**.
-   **Preview Position**: Flip the preview/footer area between the **Top** and **Bottom**.
-   **Clear History**: The "Broom" button instantly wipes your Frequently Used data.

## 📦 Technical Details

-   **Data Source**: Fetches live metadata from the [Emojibase](https://emojibase.dev/) CDN.
-   **Rendering**: Implements lazy loading for PNG/SVG sets and optimized DOM rendering for nearly 2,000 items.
-   **Icons**: [Material Symbols Outlined](https://fonts.google.com/icons) (Variable Font).
-   **Persistence**: Saves User Skin Tone, Preferred Set, Theme, and History in browser `localStorage`.

## 📥 Usage

### Option 1: Quick Start
Simply open the `index.html` file in any modern web browser. No `npm install` or local server required.

### Option 2: Developer Workflow
If you want to modify the code with Hot Module Replacement (HMR):
```bash
npm install
npm run dev
