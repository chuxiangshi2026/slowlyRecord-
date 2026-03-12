import type {MemoryFirmnessTpye} from "./words";

/*
* 加入单词后退出插件
* */
export interface ExitSwitchType {
    pluginStatus: boolean
}

/*
* 快捷键开关
* */
export interface ShortcutsSwitchType {
    shortcutEnabled: boolean
}

// 密钥
export type KeyType = Record<TranslationPlatform, {
    appkey: string;
    key: string;
}>;
export type OcrKeyType = Record<OcrPlatform, {
    appkey: string;
    key: string;
}>;

/**
 * 专注模式设置
 */
export interface FocusModeSettings {
    enabled: boolean;
    autoStick: boolean;
    alwaysOnTop: boolean;
}

/**
 * 用户设置类型
 */
export type UserSetType = DbDoc<{
    pluginStatus: boolean;
    shortcutEnabled: boolean;
    translationPlatform: TranslationPlatform;
    ocrPlatform: OcrPlatform;
    memoryFirmness: MemoryFirmnessTpye;
    keys: KeyType;
    ocrKeys: OcrKeyType;
    focusMode: FocusModeSettings;
}>;



