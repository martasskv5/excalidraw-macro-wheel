const { Plugin, PluginSettingTab, Setting, ItemView } = require("obsidian");

const DEFAULT_SETTINGS = {
    minThickness: 0.1,
    maxThickness: 10,
    tools: [
        {
            id: "pen",
            name: "Pen",
            type: "freedraw",
            enabled: true,
            icon: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>',
        },
        {
            id: "marker",
            name: "Marker",
            type: "freedraw",
            enabled: true,
            icon: '<path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>',
        },
        {
            id: "shapes",
            name: "Shapes",
            type: "rectangle",
            enabled: true,
            icon: '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>',
        },
        {
            id: "arrow",
            name: "Arrow",
            type: "arrow",
            enabled: true,
            icon: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
        },
        {
            id: "select",
            name: "Select",
            type: "selection",
            enabled: true,
            icon: '<path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="m13 13 6 6"/>',
        },
        {
            id: "notes",
            name: "Notes",
            type: "text",
            enabled: true,
            icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><polyline points="10 9 9 9 8 9"/>',
        },
        {
            id: "text",
            name: "Text",
            type: "text",
            enabled: true,
            icon: '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" x2="15" y1="20" y2="20"/><line x1="12" x2="12" y1="4" y2="20"/>',
        },
        {
            id: "eraser",
            name: "Eraser",
            type: "eraser",
            enabled: true,
            icon: '<path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/>',
        },
    ],
    colors: [
        { name: "Red", hex: "#e03131" },
        { name: "Green", hex: "#2f9e44" },
        { name: "Blue", hex: "#1971c2" },
        { name: "Yellow", hex: "#f08c00" },
        { name: "Purple", hex: "#ae3ec9" },
        { name: "Orange", hex: "#e8590c" },
        { name: "White", hex: "#ffffff" },
        { name: "Black", hex: "#1e1e1e" },
    ],
};

module.exports = class ExcalidrawMacroWheelPlugin extends Plugin {
    wheelContainer = null;
    isWheelOpen = false;
    lastMouseX = 0;
    lastMouseY = 0;

    isDraggingSlider = false;
    sliderProgressPath = null;
    sliderKnob = null;

    async onload() {
        await this.loadSettings();
        this.addSettingTab(new MacroWheelSettingTab(this.app, this));

        this.addCommand({
            id: "open-macro-wheel",
            name: "Open Macro Wheel",
            callback: () => {
                this.showWheel();
            },
        });

        this.registerDomEvent(document, "mousemove", (evt) => {
            this.lastMouseX = evt.clientX;
            this.lastMouseY = evt.clientY;
            if (this.isDraggingSlider) this.handleSliderDrag(evt.clientX, evt.clientY);
        });

        this.registerDomEvent(document, "pointerup", () => {
            this.isDraggingSlider = false;
        });

        this.registerDomEvent(document, "mousedown", (evt) => {
            if (this.isWheelOpen && this.wheelContainer && !this.wheelContainer.contains(evt.target)) {
                this.hideWheel();
            }
        });
    }

    onunload() {
        this.hideWheel();
        if (this.wheelContainer) this.wheelContainer.remove();
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        // Rebuild UI if the wheel is currently open so changes reflect immediately
        if (this.wheelContainer) {
            this.wheelContainer.empty();
            this.buildWheelUI();
            this.updateActiveStateHighlight();
        }
    }

    showWheel() {
        this.isWheelOpen = true;

        const view = this.app.workspace.getActiveViewOfType(ItemView);
        if (!view || view.getViewType() !== "excalidraw") return;

        let excalidrawWrapper =
            view.containerEl.querySelector(".excalidraw-wrapper") || view.containerEl.querySelector(".excalidraw");
        if (!excalidrawWrapper) excalidrawWrapper = view.containerEl;

        if (!this.wheelContainer) {
            this.wheelContainer = document.createElement("div");
            this.wheelContainer.id = "excalidraw-macro-wheel-container";
            this.buildWheelUI();
        }

        if (this.wheelContainer.parentElement !== excalidrawWrapper) {
            excalidrawWrapper.appendChild(this.wheelContainer);
        }

        this.updateActiveStateHighlight();
        this.positionWheel(this.lastMouseX, this.lastMouseY);
        this.wheelContainer.style.display = "block";
    }

    hideWheel() {
        this.isWheelOpen = false;
        this.isDraggingSlider = false;
        if (this.wheelContainer) this.wheelContainer.style.display = "none";
    }

    positionWheel(x, y) {
        if (!this.wheelContainer) return;
        const size = 360;
        const parentRect = this.wheelContainer.parentElement.getBoundingClientRect();

        let left = x - parentRect.left - size / 2;
        let top = y - parentRect.top - size / 2;

        const maxLeft = parentRect.width - size;
        left = Math.max(0, Math.min(left, maxLeft));

        const maxTop = parentRect.height - size;
        top = Math.max(0, Math.min(top, maxTop));

        this.wheelContainer.style.left = `${left}px`;
        this.wheelContainer.style.top = `${top}px`;
    }

    getExcalidrawAPI() {
        const ea = window.ExcalidrawAutomate;
        if (!ea) return null;
        const view = this.app.workspace.getActiveViewOfType(ItemView);
        if (!view || view.getViewType() !== "excalidraw") return null;
        ea.setView(view);
        return ea.getExcalidrawAPI();
    }

    getPointAtAngle(cx, cy, r, angleDegrees) {
        const rad = ((angleDegrees - 90) * Math.PI) / 180;
        return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
    }

    createWedge(cx, cy, innerR, outerR, startAngle, endAngle, options) {
        const startRad = ((startAngle - 90) * Math.PI) / 180.0;
        const endRad = ((endAngle - 90) * Math.PI) / 180.0;
        const x1 = cx + innerR * Math.cos(startRad);
        const y1 = cy + innerR * Math.sin(startRad);
        const x2 = cx + outerR * Math.cos(startRad);
        const y2 = cy + outerR * Math.sin(startRad);
        const x3 = cx + outerR * Math.cos(endRad);
        const y3 = cy + outerR * Math.sin(endRad);
        const x4 = cx + innerR * Math.cos(endRad);
        const y4 = cy + innerR * Math.sin(endRad);
        const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

        const pathData = `M ${x1} ${y1} L ${x2} ${y2} A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${x3} ${y3} L ${x4} ${y4} A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${x1} ${y1} Z`;

        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.style.cursor = "pointer";

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", pathData);
        path.setAttribute("fill", options.fill || "#2a2a2a");
        path.setAttribute("stroke", options.stroke || "#111");
        path.setAttribute("stroke-width", options.strokeWidth || "1");
        if (options.className) path.setAttribute("class", options.className);

        if (options.label) {
            const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
            title.textContent = options.label;
            g.appendChild(title);
        }

        g.appendChild(path);

        if (options.onClick) {
            g.addEventListener("click", (e) => {
                e.stopPropagation();
                options.onClick();
                this.hideWheel();
            });
        }

        if (options.icon) {
            const midAngleRad = ((startAngle + (endAngle - startAngle) / 2 - 90) * Math.PI) / 180.0;
            const iconR = (innerR + outerR) / 2;
            const iconX = cx + iconR * Math.cos(midAngleRad);
            const iconY = cy + iconR * Math.sin(midAngleRad);

            const iconSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            iconSvg.setAttribute("width", "18");
            iconSvg.setAttribute("height", "18");
            iconSvg.setAttribute("viewBox", "0 0 24 24");
            iconSvg.setAttribute("fill", "none");
            iconSvg.setAttribute("stroke", options.iconColor || "#ccc");
            iconSvg.setAttribute("stroke-width", "2");
            iconSvg.setAttribute("stroke-linecap", "round");
            iconSvg.setAttribute("stroke-linejoin", "round");
            iconSvg.setAttribute("x", iconX - 9);
            iconSvg.setAttribute("y", iconY - 9);
            iconSvg.setAttribute("pointer-events", "none");

            const parser = new DOMParser();
            const doc = parser.parseFromString(
                `<svg xmlns="http://www.w3.org/2000/svg">${options.icon}</svg>`,
                "image/svg+xml",
            );
            Array.from(doc.documentElement.childNodes).forEach((child) => {
                iconSvg.appendChild(child);
            });
            g.appendChild(iconSvg);
        }
        return g;
    }

    activateTool(toolType) {
        const api = this.getExcalidrawAPI();
        if (api) api.setActiveTool({ type: toolType });
    }

    activateColor(colorHex) {
        const api = this.getExcalidrawAPI();
        if (api) {
            const appState = api.getAppState();
            api.updateScene({ appState: { ...appState, currentItemStrokeColor: colorHex } });
        }
    }

    handleSliderDrag(clientX, clientY) {
        if (!this.wheelContainer) return;
        const rect = this.wheelContainer.getBoundingClientRect();
        const cx = rect.left + 180;
        const cy = rect.top + 180;

        const dx = clientX - cx;
        const dy = clientY - cy;
        let atan2Angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        let ourAngle = (atan2Angle + 90 + 360) % 360;

        if (ourAngle > 140 && ourAngle < 220) {
            if (ourAngle < 180) ourAngle = 140;
            else ourAngle = 220;
        }

        let normalizedAngle = ourAngle >= 220 ? ourAngle - 220 : ourAngle + 360 - 220;
        const percent = normalizedAngle / 280;

        const minT = this.settings.minThickness;
        const maxT = this.settings.maxThickness;
        const thickness = minT * Math.pow(maxT / minT, percent);

        this.setThickness(thickness);
    }

    setThickness(thickness) {
        const api = this.getExcalidrawAPI();
        if (api) {
            api.updateScene({ appState: { currentItemStrokeWidth: thickness } });
        }
        this.updateSliderVisuals(thickness);
    }

    updateSliderVisuals(thickness) {
        if (!this.sliderProgressPath || !this.sliderKnob) return;

        const minT = this.settings.minThickness;
        const maxT = this.settings.maxThickness;

        thickness = Math.max(minT, Math.min(maxT, thickness));
        const percent = Math.log(thickness / minT) / Math.log(maxT / minT);
        const angle = 220 + percent * 280;
        const cx = 180;
        const cy = 180;
        const sliderR = 160;

        if (thickness <= minT + 0.01) {
            this.sliderProgressPath.setAttribute("d", "");
        } else {
            const startPt = this.getPointAtAngle(cx, cy, sliderR, 220);
            const endPt = this.getPointAtAngle(cx, cy, sliderR, angle);
            const largeArcFlag = angle - 220 > 180 ? "1" : "0";
            this.sliderProgressPath.setAttribute(
                "d",
                `M ${startPt.x} ${startPt.y} A ${sliderR} ${sliderR} 0 ${largeArcFlag} 1 ${endPt.x} ${endPt.y}`,
            );
        }

        const knobPt = this.getPointAtAngle(cx, cy, sliderR, angle);
        this.sliderKnob.setAttribute("cx", knobPt.x);
        this.sliderKnob.setAttribute("cy", knobPt.y);

        const api = this.getExcalidrawAPI();
        if (api) {
            const appState = api.getAppState();
            const activeToolDef = this.settings.tools.find((t) => t.type === appState.activeTool.type) || {
                name: "Tool",
            };

            const nameSpan = this.wheelContainer.querySelector("#inner-tool-name");
            const sizeSpan = this.wheelContainer.querySelector("#inner-tool-size");

            if (nameSpan && sizeSpan) {
                nameSpan.textContent = activeToolDef.name;
                let displayStr = thickness < 1 ? thickness.toFixed(1) : Math.round(thickness).toString();
                sizeSpan.textContent = `${displayStr}px`;
            }
        }
    }

    updateActiveStateHighlight() {
        const api = this.getExcalidrawAPI();
        if (!api) return;

        const appState = api.getAppState();
        const activeToolType = appState.activeTool.type;
        const activeStrokeColor = appState.currentItemStrokeColor;
        const currentThickness = appState.currentItemStrokeWidth || 1;
        const isDarkTheme = appState.theme === "dark";

        const toolWedges = this.wheelContainer.querySelectorAll(".tool-wedge");
        toolWedges.forEach((w) => {
            w.setAttribute("fill", "#2a2a2a");
            const icon = w.parentElement.querySelector("svg");
            if (icon) icon.setAttribute("stroke", "#ccc");
        });

        const activeToolWedge = this.wheelContainer.querySelector(`.tool-wedge[data-type="${activeToolType}"]`);
        if (activeToolWedge) {
            activeToolWedge.setAttribute("fill", "#1e70c5");
            const icon = activeToolWedge.parentElement.querySelector("svg");
            if (icon) icon.setAttribute("stroke", "#ffffff");
        }

        const colorWedges = this.wheelContainer.querySelectorAll(".color-wedge");
        colorWedges.forEach((w) => {
            const hex = w.dataset.hex;
            let visualHex = hex;
            if (isDarkTheme) {
                if (hex === "#ffffff") visualHex = "#1e1e1e";
                if (hex === "#1e1e1e") visualHex = "#ffffff";
            }
            w.setAttribute("fill", visualHex);
            let strokeColor = "transparent";
            if (visualHex === "#ffffff") strokeColor = "#555";
            if (visualHex === "#1e1e1e") strokeColor = "#aaa";
            w.setAttribute("stroke", strokeColor);
            w.setAttribute("stroke-width", "1");
            if (hex === activeStrokeColor) {
                w.setAttribute("stroke", "#ff0000");
                w.setAttribute("stroke-width", "3");
            }
        });

        this.updateSliderVisuals(currentThickness);
    }

    buildWheelUI() {
        if (!this.wheelContainer) return;
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("width", "360");
        svg.setAttribute("height", "360");
        svg.setAttribute("viewBox", "0 0 360 360");

        const cx = 180;
        const cy = 180;

        const bg = document.createElementNS(svgNS, "circle");
        bg.setAttribute("cx", cx);
        bg.setAttribute("cy", cy);
        bg.setAttribute("r", "170");
        bg.setAttribute("fill", "#111");
        svg.appendChild(bg);

        // Only use enabled tools
        const activeTools = this.settings.tools.filter((t) => t.enabled);
        const numTools = activeTools.length;
        const toolAngle = 360 / numTools;

        activeTools.forEach((tool, index) => {
            const startAngle = index * toolAngle;
            const endAngle = startAngle + toolAngle;
            const g = this.createWedge(cx, cy, 55, 100, startAngle, endAngle, {
                fill: "#2a2a2a",
                className: `tool-wedge`,
                label: tool.name,
                icon: tool.icon,
                onClick: () => this.activateTool(tool.type),
            });
            g.querySelector("path").dataset.type = tool.type;
            svg.appendChild(g);
        });

        const numColors = this.settings.colors.length;
        const colorAngle = 360 / numColors;
        this.settings.colors.forEach((color, index) => {
            const startAngle = index * colorAngle;
            const endAngle = startAngle + colorAngle;
            const g = this.createWedge(cx, cy, 110, 140, startAngle + 1.5, endAngle - 1.5, {
                fill: color.hex,
                className: `color-wedge`,
                onClick: () => this.activateColor(color.hex),
            });
            g.querySelector("path").dataset.hex = color.hex;
            svg.appendChild(g);
        });

        const sliderR = 160;
        const startPt = this.getPointAtAngle(cx, cy, sliderR, 220);
        const endPt = this.getPointAtAngle(cx, cy, sliderR, 140);
        const trackPathData = `M ${startPt.x} ${startPt.y} A ${sliderR} ${sliderR} 0 1 1 ${endPt.x} ${endPt.y}`;

        const trackPath = document.createElementNS(svgNS, "path");
        trackPath.setAttribute("d", trackPathData);
        trackPath.setAttribute("fill", "none");
        trackPath.setAttribute("stroke", "#333");
        trackPath.setAttribute("stroke-width", "12");
        trackPath.setAttribute("stroke-linecap", "round");
        svg.appendChild(trackPath);

        const hitPath = document.createElementNS(svgNS, "path");
        hitPath.setAttribute("d", trackPathData);
        hitPath.setAttribute("fill", "none");
        hitPath.setAttribute("stroke", "transparent");
        hitPath.setAttribute("stroke-width", "25");
        hitPath.style.pointerEvents = "stroke";
        hitPath.style.cursor = "pointer";
        hitPath.addEventListener("pointerdown", (e) => {
            e.stopPropagation();
            this.isDraggingSlider = true;
            this.handleSliderDrag(e.clientX, e.clientY);
        });
        svg.appendChild(hitPath);

        this.sliderProgressPath = document.createElementNS(svgNS, "path");
        this.sliderProgressPath.setAttribute("fill", "none");
        this.sliderProgressPath.setAttribute("stroke", "#ff0000");
        this.sliderProgressPath.setAttribute("stroke-width", "12");
        this.sliderProgressPath.setAttribute("stroke-linecap", "round");
        svg.appendChild(this.sliderProgressPath);

        this.sliderKnob = document.createElementNS(svgNS, "circle");
        this.sliderKnob.setAttribute("r", "8");
        this.sliderKnob.setAttribute("fill", "#fff");
        this.sliderKnob.setAttribute("stroke", "#111");
        this.sliderKnob.setAttribute("stroke-width", "2");
        this.sliderKnob.classList.add("slider-knob");
        svg.appendChild(this.sliderKnob);

        const innerCircle = document.createElementNS(svgNS, "circle");
        innerCircle.setAttribute("cx", cx);
        innerCircle.setAttribute("cy", cy);
        innerCircle.setAttribute("r", "45");
        innerCircle.setAttribute("fill", "#1a1a1a");
        innerCircle.setAttribute("stroke", "#ff0000");
        innerCircle.setAttribute("stroke-width", "2");
        svg.appendChild(innerCircle);

        const innerText = document.createElementNS(svgNS, "text");
        innerText.setAttribute("x", cx);
        innerText.setAttribute("y", cy);
        innerText.setAttribute("text-anchor", "middle");
        innerText.setAttribute("dominant-baseline", "middle");
        innerText.setAttribute("fill", "white");
        innerText.setAttribute("font-size", "13px");
        innerText.setAttribute("font-weight", "bold");

        const nameSpan = document.createElementNS(svgNS, "tspan");
        nameSpan.setAttribute("id", "inner-tool-name");
        nameSpan.setAttribute("x", cx);
        nameSpan.setAttribute("dy", "-0.6em");
        nameSpan.textContent = "Loading";

        const sizeSpan = document.createElementNS(svgNS, "tspan");
        sizeSpan.setAttribute("id", "inner-tool-size");
        sizeSpan.setAttribute("x", cx);
        sizeSpan.setAttribute("dy", "1.4em");
        sizeSpan.setAttribute("font-size", "11px");
        sizeSpan.setAttribute("font-weight", "normal");
        sizeSpan.setAttribute("fill", "#aaa");
        sizeSpan.textContent = "1px";

        innerText.appendChild(nameSpan);
        innerText.appendChild(sizeSpan);
        svg.appendChild(innerText);

        this.wheelContainer.appendChild(svg);
    }
};

// --- NEW: SETTINGS TAB CLASS ---
class MacroWheelSettingTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.addClass("macro-wheel-settings");

        // 1. Create Tab Navigation
        const navContainer = containerEl.createDiv("macro-wheel-nav");
        const tabs = [
            { id: "general", name: "General" },
            { id: "tools", name: "Tools" },
            { id: "colors", name: "Colors" },
        ];

        const contentContainer = containerEl.createDiv("macro-wheel-content");

        tabs.forEach((tab, index) => {
            const btn = navContainer.createEl("button", { text: tab.name, cls: "macro-wheel-tab-btn" });
            if (index === 0) btn.addClass("active"); // Default active

            const section = contentContainer.createDiv({ cls: "macro-wheel-section" });
            section.id = `section-${tab.id}`;
            if (index !== 0) section.style.display = "none"; // Hide by default

            btn.onclick = () => {
                navContainer.querySelectorAll(".macro-wheel-tab-btn").forEach((b) => b.removeClass("active"));
                contentContainer.querySelectorAll(".macro-wheel-section").forEach((s) => (s.style.display = "none"));
                btn.addClass("active");
                section.style.display = "block";
            };
        });

        // 2. Populate General Tab
        const generalSection = contentContainer.querySelector("#section-general");
        new Setting(generalSection)
            .setName("Minimum Thickness")
            .setDesc("The lowest value on the thickness slider (e.g., 0.1).")
            .addText((text) =>
                text.setValue(this.plugin.settings.minThickness.toString()).onChange(async (value) => {
                    const num = parseFloat(value);
                    if (!isNaN(num) && num > 0) {
                        this.plugin.settings.minThickness = num;
                        await this.plugin.saveSettings();
                    }
                }),
            );

        new Setting(generalSection)
            .setName("Maximum Thickness")
            .setDesc("The highest value on the thickness slider (e.g., 10).")
            .addText((text) =>
                text.setValue(this.plugin.settings.maxThickness.toString()).onChange(async (value) => {
                    const num = parseFloat(value);
                    if (!isNaN(num) && num > 0) {
                        this.plugin.settings.maxThickness = num;
                        await this.plugin.saveSettings();
                    }
                }),
            );

        // 3. Populate Tools Tab
        const toolsSection = contentContainer.querySelector("#section-tools");
        toolsSection.createEl("p", {
            text: "Toggle visibility, rename, or reorder the tools on the wheel.",
            cls: "setting-item-description",
        });

        this.plugin.settings.tools.forEach((tool, index) => {
            const setting = new Setting(toolsSection)
                .setName(tool.name)
                .addToggle((toggle) =>
                    toggle.setValue(tool.enabled).onChange(async (value) => {
                        tool.enabled = value;
                        await this.plugin.saveSettings();
                    }),
                )
                .addExtraButton((button) =>
                    button
                        .setIcon("arrow-up")
                        .setTooltip("Move Up")
                        .setDisabled(index === 0)
                        .onClick(async () => {
                            if (index > 0) {
                                const temp = this.plugin.settings.tools[index - 1];
                                this.plugin.settings.tools[index - 1] = this.plugin.settings.tools[index];
                                this.plugin.settings.tools[index] = temp;
                                await this.plugin.saveSettings();
                                this.display(); // Re-render to show new order
                            }
                        }),
                )
                .addExtraButton((button) =>
                    button
                        .setIcon("arrow-down")
                        .setTooltip("Move Down")
                        .setDisabled(index === this.plugin.settings.tools.length - 1)
                        .onClick(async () => {
                            if (index < this.plugin.settings.tools.length - 1) {
                                const temp = this.plugin.settings.tools[index + 1];
                                this.plugin.settings.tools[index + 1] = this.plugin.settings.tools[index];
                                this.plugin.settings.tools[index] = temp;
                                await this.plugin.saveSettings();
                                this.display(); // Re-render to show new order
                            }
                        }),
                );
        });

        // 4. Populate Colors Tab
        const colorsSection = contentContainer.querySelector("#section-colors");
        colorsSection.createEl("p", {
            text: "Manage the colors displayed on the outer ring.",
            cls: "setting-item-description",
        });

        this.plugin.settings.colors.forEach((color, index) => {
            new Setting(colorsSection)
                .setName(`Color ${index + 1}`)
                .addColorPicker((picker) =>
                    picker.setValue(color.hex).onChange(async (value) => {
                        color.hex = value;
                        await this.plugin.saveSettings();
                    }),
                )
                .addExtraButton((button) =>
                    button
                        .setIcon("trash")
                        .setTooltip("Delete Color")
                        .onClick(async () => {
                            this.plugin.settings.colors.splice(index, 1);
                            await this.plugin.saveSettings();
                            this.display();
                        }),
                );
        });

        new Setting(colorsSection).addButton((btn) =>
            btn
                .setButtonText("Add Color")
                .setCta()
                .onClick(async () => {
                    this.plugin.settings.colors.push({ name: "Custom", hex: "#888888" });
                    await this.plugin.saveSettings();
                    this.display();
                }),
        );
    }
}
