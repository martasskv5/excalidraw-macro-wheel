import { App, PluginSettingTab, Setting } from "obsidian";
import ExcalidrawMacroWheelPlugin from "./main";

export interface ToolConfig {
    id: string;
    name: string;
    type: string;
    enabled: boolean;
    icon: string;
}

export interface ColorConfig {
    name: string;
    hex: string;
}

export interface MacroWheelSettings {
    minThickness: number;
    maxThickness: number;
    tools: ToolConfig[];
    colors: ColorConfig[];
}

export const DEFAULT_SETTINGS: MacroWheelSettings = {
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

export class MacroWheelSettingTab extends PluginSettingTab {
    plugin: ExcalidrawMacroWheelPlugin;

    constructor(app: App, plugin: ExcalidrawMacroWheelPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
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
                contentContainer.querySelectorAll(".macro-wheel-section").forEach((s) => ((s as HTMLElement).style.display = "none"));
                btn.addClass("active");
                section.style.display = "block";
            };
        });

        // 2. Populate General Tab
        const generalSection = contentContainer.querySelector("#section-general") as HTMLElement;
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
        const toolsSection = contentContainer.querySelector("#section-tools") as HTMLElement;
        toolsSection.createEl("p", {
            text: "Toggle visibility, rename, or reorder the tools on the wheel.",
            cls: "setting-item-description",
        });

        this.plugin.settings.tools.forEach((tool, index) => {
            new Setting(toolsSection)
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
                                // FIXED: Added ! to tell TS these exist
                                const temp = this.plugin.settings.tools[index - 1]!;
                                this.plugin.settings.tools[index - 1] = this.plugin.settings.tools[index]!;
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
                                // FIXED: Added ! to tell TS these exist
                                const temp = this.plugin.settings.tools[index + 1]!;
                                this.plugin.settings.tools[index + 1] = this.plugin.settings.tools[index]!;
                                this.plugin.settings.tools[index] = temp;
                                await this.plugin.saveSettings();
                                this.display(); // Re-render to show new order
                            }
                        }),
                );
        });

        // 4. Populate Colors Tab
        const colorsSection = contentContainer.querySelector("#section-colors") as HTMLElement;
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