import { Plugin, ItemView } from "obsidian";
import { DEFAULT_SETTINGS, MacroWheelSettings, MacroWheelSettingTab } from "./settings";

export default class ExcalidrawMacroWheelPlugin extends Plugin {
    settings!: MacroWheelSettings;
    wheelContainer: HTMLDivElement | null = null;
    isWheelOpen: boolean = false;
    lastMouseX: number = 0;
    lastMouseY: number = 0;

    isDraggingSlider: boolean = false;
    sliderProgressPath: SVGPathElement | null = null;
    sliderKnob: SVGCircleElement | null = null;

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

        this.registerDomEvent(document, "mousemove", (evt: MouseEvent) => {
            this.lastMouseX = evt.clientX;
            this.lastMouseY = evt.clientY;
            if (this.isDraggingSlider) this.handleSliderDrag(evt.clientX, evt.clientY);
        });

        this.registerDomEvent(document, "pointerup", () => {
            this.isDraggingSlider = false;
        });

        this.registerDomEvent(document, "mousedown", (evt: MouseEvent) => {
            if (this.isWheelOpen && this.wheelContainer && !this.wheelContainer.contains(evt.target as Node)) {
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

        let excalidrawWrapper = view.containerEl.querySelector(".excalidraw-wrapper") as HTMLElement || view.containerEl.querySelector(".excalidraw") as HTMLElement;
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

    positionWheel(x: number, y: number) {
        if (!this.wheelContainer || !this.wheelContainer.parentElement) return;
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

    getExcalidrawAPI(): any {
        const ea = (window as any).ExcalidrawAutomate;
        if (!ea) return null;
        const view = this.app.workspace.getActiveViewOfType(ItemView);
        if (!view || view.getViewType() !== "excalidraw") return null;
        ea.setView(view);
        return ea.getExcalidrawAPI();
    }

    getPointAtAngle(cx: number, cy: number, r: number, angleDegrees: number): { x: number, y: number } {
        const rad = ((angleDegrees - 90) * Math.PI) / 180;
        return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
    }

    createWedge(cx: number, cy: number, innerR: number, outerR: number, startAngle: number, endAngle: number, options: any): SVGGElement {
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

        const g = document.createElementNS("http://www.w3.org/2000/svg", "g") as SVGGElement;
        g.style.cursor = "pointer";

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path") as SVGPathElement;
        path.setAttribute("d", pathData);
        path.setAttribute("fill", options.fill || "#2a2a2a");
        path.setAttribute("stroke", options.stroke || "#111");
        path.setAttribute("stroke-width", options.strokeWidth || "1");
        if (options.className) path.setAttribute("class", options.className);

        if (options.label) {
            const title = document.createElementNS("http://www.w3.org/2000/svg", "title") as SVGTitleElement;
            title.textContent = options.label;
            g.appendChild(title);
        }

        g.appendChild(path);

        if (options.onClick) {
            g.addEventListener("click", (e: MouseEvent) => {
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

            const iconSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg") as SVGSVGElement;
            iconSvg.setAttribute("width", "18");
            iconSvg.setAttribute("height", "18");
            iconSvg.setAttribute("viewBox", "0 0 24 24");
            iconSvg.setAttribute("fill", "none");
            iconSvg.setAttribute("stroke", options.iconColor || "#ccc");
            iconSvg.setAttribute("stroke-width", "2");
            iconSvg.setAttribute("stroke-linecap", "round");
            iconSvg.setAttribute("stroke-linejoin", "round");
            iconSvg.setAttribute("x", (iconX - 9).toString());
            iconSvg.setAttribute("y", (iconY - 9).toString());
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

    activateTool(toolType: string) {
        const api = this.getExcalidrawAPI();
        if (api) api.setActiveTool({ type: toolType });
    }

    activateColor(colorHex: string) {
        const api = this.getExcalidrawAPI();
        if (api) {
            const appState = api.getAppState();
            api.updateScene({ appState: { ...appState, currentItemStrokeColor: colorHex } });
        }
    }

    handleSliderDrag(clientX: number, clientY: number) {
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

    setThickness(thickness: number) {
        const api = this.getExcalidrawAPI();
        if (api) {
            api.updateScene({ appState: { currentItemStrokeWidth: thickness } });
        }
        this.updateSliderVisuals(thickness);
    }

    updateSliderVisuals(thickness: number) {
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
        this.sliderKnob.setAttribute("cx", knobPt.x.toString());
        this.sliderKnob.setAttribute("cy", knobPt.y.toString());

        const api = this.getExcalidrawAPI();
        if (api) {
            const appState = api.getAppState();
            const activeToolDef = this.settings.tools.find((t) => t.type === appState.activeTool.type) || {
                name: "Tool",
            };

            const nameSpan = this.wheelContainer!.querySelector("#inner-tool-name");
            const sizeSpan = this.wheelContainer!.querySelector("#inner-tool-size");

            if (nameSpan && sizeSpan) {
                nameSpan.textContent = activeToolDef.name;
                let displayStr = thickness < 1 ? thickness.toFixed(1) : Math.round(thickness).toString();
                sizeSpan.textContent = `${displayStr}px`;
            }
        }
    }

    updateActiveStateHighlight() {
        const api = this.getExcalidrawAPI();
        if (!api || !this.wheelContainer) return;

        const appState = api.getAppState();
        const activeToolType = appState.activeTool.type;
        const activeStrokeColor = appState.currentItemStrokeColor;
        const currentThickness = appState.currentItemStrokeWidth || 1;
        const isDarkTheme = appState.theme === "dark";

        const toolWedges = this.wheelContainer.querySelectorAll(".tool-wedge");
        toolWedges.forEach((w) => {
            const path = w as SVGPathElement;
            path.setAttribute("fill", "#2a2a2a");
            const icon = path.parentElement?.querySelector("svg");
            if (icon) icon.setAttribute("stroke", "#ccc");
        });

        const activeToolWedge = this.wheelContainer.querySelector(`.tool-wedge[data-type="${activeToolType}"]`) as SVGPathElement;
        if (activeToolWedge) {
            activeToolWedge.setAttribute("fill", "#1e70c5");
            const icon = activeToolWedge.parentElement?.querySelector("svg");
            if (icon) icon.setAttribute("stroke", "#ffffff");
        }

        const colorWedges = this.wheelContainer.querySelectorAll(".color-wedge");
        colorWedges.forEach((w) => {
            const path = w as SVGPathElement;
            const hex = path.dataset.hex;
            let visualHex = hex;
            if (isDarkTheme) {
                if (hex === "#ffffff") visualHex = "#1e1e1e";
                if (hex === "#1e1e1e") visualHex = "#ffffff";
            }
            path.setAttribute("fill", visualHex || "");
            let strokeColor = "transparent";
            if (visualHex === "#ffffff") strokeColor = "#555";
            if (visualHex === "#1e1e1e") strokeColor = "#aaa";
            path.setAttribute("stroke", strokeColor);
            path.setAttribute("stroke-width", "1");
            if (hex === activeStrokeColor) {
                path.setAttribute("stroke", "#ff0000");
                path.setAttribute("stroke-width", "3");
            }
        });

        this.updateSliderVisuals(currentThickness);
    }

    buildWheelUI() {
        if (!this.wheelContainer) return;
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg") as SVGSVGElement;
        svg.setAttribute("width", "360");
        svg.setAttribute("height", "360");
        svg.setAttribute("viewBox", "0 0 360 360");

        const cx = 180;
        const cy = 180;

        const bg = document.createElementNS(svgNS, "circle") as SVGCircleElement;
        bg.setAttribute("cx", cx.toString());
        bg.setAttribute("cy", cy.toString());
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
            const path = g.querySelector("path") as SVGPathElement;
            path.dataset.type = tool.type;
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
            const path = g.querySelector("path") as SVGPathElement;
            path.dataset.hex = color.hex;
            svg.appendChild(g);
        });

        const sliderR = 160;
        const startPt = this.getPointAtAngle(cx, cy, sliderR, 220);
        const endPt = this.getPointAtAngle(cx, cy, sliderR, 140);
        const trackPathData = `M ${startPt.x} ${startPt.y} A ${sliderR} ${sliderR} 0 1 1 ${endPt.x} ${endPt.y}`;

        const trackPath = document.createElementNS(svgNS, "path") as SVGPathElement;
        trackPath.setAttribute("d", trackPathData);
        trackPath.setAttribute("fill", "none");
        trackPath.setAttribute("stroke", "#333");
        trackPath.setAttribute("stroke-width", "12");
        trackPath.setAttribute("stroke-linecap", "round");
        svg.appendChild(trackPath);

        const hitPath = document.createElementNS(svgNS, "path") as SVGPathElement;
        hitPath.setAttribute("d", trackPathData);
        hitPath.setAttribute("fill", "none");
        hitPath.setAttribute("stroke", "transparent");
        hitPath.setAttribute("stroke-width", "25");
        hitPath.style.pointerEvents = "stroke";
        hitPath.style.cursor = "pointer";
        hitPath.addEventListener("pointerdown", (e: PointerEvent) => {
            e.stopPropagation();
            this.isDraggingSlider = true;
            this.handleSliderDrag(e.clientX, e.clientY);
        });
        svg.appendChild(hitPath);

        this.sliderProgressPath = document.createElementNS(svgNS, "path") as SVGPathElement;
        this.sliderProgressPath.setAttribute("fill", "none");
        this.sliderProgressPath.setAttribute("stroke", "#ff0000");
        this.sliderProgressPath.setAttribute("stroke-width", "12");
        this.sliderProgressPath.setAttribute("stroke-linecap", "round");
        svg.appendChild(this.sliderProgressPath);

        this.sliderKnob = document.createElementNS(svgNS, "circle") as SVGCircleElement;
        this.sliderKnob.setAttribute("r", "8");
        this.sliderKnob.setAttribute("fill", "#fff");
        this.sliderKnob.setAttribute("stroke", "#111");
        this.sliderKnob.setAttribute("stroke-width", "2");
        this.sliderKnob.classList.add("slider-knob");
        svg.appendChild(this.sliderKnob);

        const innerCircle = document.createElementNS(svgNS, "circle") as SVGCircleElement;
        innerCircle.setAttribute("cx", cx.toString());
        innerCircle.setAttribute("cy", cy.toString());
        innerCircle.setAttribute("r", "45");
        innerCircle.setAttribute("fill", "#1a1a1a");
        innerCircle.setAttribute("stroke", "#ff0000");
        innerCircle.setAttribute("stroke-width", "2");
        svg.appendChild(innerCircle);

        const innerText = document.createElementNS(svgNS, "text") as SVGTextElement;
        innerText.setAttribute("x", cx.toString());
        innerText.setAttribute("y", cy.toString());
        innerText.setAttribute("text-anchor", "middle");
        innerText.setAttribute("dominant-baseline", "middle");
        innerText.setAttribute("fill", "white");
        innerText.setAttribute("font-size", "13px");
        innerText.setAttribute("font-weight", "bold");

        const nameSpan = document.createElementNS(svgNS, "tspan") as SVGTSpanElement;
        nameSpan.setAttribute("id", "inner-tool-name");
        nameSpan.setAttribute("x", cx.toString());
        nameSpan.setAttribute("dy", "-0.6em");
        nameSpan.textContent = "Loading";

        const sizeSpan = document.createElementNS(svgNS, "tspan") as SVGTSpanElement;
        sizeSpan.setAttribute("id", "inner-tool-size");
        sizeSpan.setAttribute("x", cx.toString());
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
}