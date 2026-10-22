# 🎡 Excalidraw Macro Wheel for Obsidian

Bring the power of radial menus to Excalidraw in Obsidian. Inspired by tools like **Wayscriber**, this plugin allows you to instantly switch drawing tools, pick colors, and adjust stroke thickness without ever taking your mouse or pen off the canvas.

**Designed specifically with graphic tablets in mind**, this plugin eliminates the need to reach for your keyboard or break your drawing flow.

## ✨ Features

- **Graphic Tablet Optimized:** Built for artists using Wacom, Huion, XP-Pen. Bind the macro wheel to a tablet pen's side button to create a seamless workflow where your pen becomes both your brush and your tool selector.
- **Cursor-Centric UI:** The wheel appears exactly where your cursor is, keeping your focus on your drawing. It intelligently clamps to the edges of the Excalidraw canvas so it never gets cut off by Obsidian's UI.
- **Tool Selection Ring:** Click on intuitive icons to instantly switch between Pen, Marker, Shapes, Arrow, Select, Text, Notes, and Eraser.
- **Color Ring:** A quick-access ring of your most-used colors. It automatically handles Excalidraw's theme-aware Black/White swapping when you switch between light and dark mode.
- **Logarithmic Thickness Slider:** A 7/9th circular slider (with a gap at the bottom) allows you to precisely control stroke thickness. The logarithmic scale gives you extreme precision for fine lines (0.1px) while still letting you easily access bold strokes (up to 10px).
- **Active State Highlighting:** When the wheel opens, it reads Excalidraw's state to highlight your current tool, active color, and exact stroke thickness in the center display.
- **Fully Customizable Settings:** A beautiful, tabbed settings interface lets you reorder tools, toggle them on/off, add custom colors, and adjust the slider's minimum and maximum limits.

## 📦 Installation

Since this plugin is in active development, it is not yet in the Obsidian Community Store. To install it manually:

1. Download the latest release (or build from source).
2. Navigate to your Obsidian vault's plugin folder: `<YourVault>/.obsidian/plugins/`
3. Create a new folder named `excalidraw-macro-wheel`.
4. Place the `main.js`, `manifest.json`, and `styles.css` files into this folder.
5. Open Obsidian, go to **Settings -> Community Plugins**, and enable **Excalidraw Macro Wheel**.

## 🚀 Usage

1. Open an Excalidraw drawing in Obsidian.
2. Open the Command Palette (`Ctrl/Cmd + P`) and search for **"Open Macro Wheel"**.
3. **Left-click** a tool or color to select it, or **click and drag** the outer white knob to adjust the stroke thickness.

**💡 Tablet Tip:**
If you are using a graphic tablet, map the **"Open Macro Wheel"** command to a button on your stylus (e.g., the side button or eraser button). This allows you to rapidly flick open the menu, select a new color or tool, and continue drawing without ever putting your pen down or touching the keyboard.

## ⚙️ Settings

Navigate to **Settings -> Excalidraw Macro Wheel** to customize your experience:

- **General Tab:** Change the minimum and maximum thickness limits for the logarithmic slider.
- **Tools Tab:** Toggle tools on or off. Use the arrow buttons to change the order of the tools around the wheel.
- **Colors Tab:** Add, remove, or change the colors on the outer ring using Obsidian's native color picker.

## 🛠️ Development

If you want to modify the plugin or build it from source:

1. Clone this repository into your `.obsidian/plugins/` folder.
2. Install dependencies:

    ```bash
    npm install
    ```

3. Make changes to main.ts, and the compiler will automatically generate the main.js file. Reload Obsidian to see your changes.

## Built With

- [Obsidian API](https://github.com/obsidianmd/obsidian-api)
- [ExcalidrawAutomate API](https://github.com/zsviczian/obsidian-excalidraw-plugin)
- Vanilla SVG & TypeScript (No heavy UI frameworks!)

## 🙏 Credits

- Huge inspiration from [Wayscriber](https://github.com/devmobasa/wayscriber) for the radial UI design.
- Thanks to the Excalidraw team and obsidian-excalidraw-plugin for exposing the amazing ExcalidrawAutomate API.

## 📄 License

MIT License. Feel free to fork, modify, and use it in your own workflows!
