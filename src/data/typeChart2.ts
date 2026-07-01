import type { PokemonType } from "./types";

export type TypeEffectiveness = {
    superEffective?: PokemonType[];
    notVeryEffective?: PokemonType[];
    noEffect?: PokemonType[];
};

/**
 * 攻撃タイプごとの相性定義。
 *
 * superEffective: 2倍
 * notVeryEffective: 0.5倍
 * noEffect: 0倍
 *
 * ここに書かれていない組み合わせは等倍 = 1倍として扱う。
 */
export const TYPE_EFFECTIVENESS: Record<PokemonType, TypeEffectiveness> = {
    ノーマル: {
        notVeryEffective: ["いわ", "はがね"],
        noEffect: ["ゴースト"],
    },

    ほのお: {
        superEffective: ["くさ", "こおり", "むし", "はがね"],
        notVeryEffective: ["ほのお", "みず", "いわ", "ドラゴン"],
    },

    みず: {
        superEffective: ["ほのお", "じめん", "いわ"],
        notVeryEffective: ["みず", "くさ", "ドラゴン"],
    },

    でんき: {
        superEffective: ["みず", "ひこう"],
        notVeryEffective: ["でんき", "くさ", "ドラゴン"],
        noEffect: ["じめん"],
    },

    くさ: {
        superEffective: ["みず", "じめん", "いわ"],
        notVeryEffective: [
            "ほのお",
            "くさ",
            "どく",
            "ひこう",
            "むし",
            "ドラゴン",
            "はがね",
        ],
    },

    こおり: {
        superEffective: ["くさ", "じめん", "ひこう", "ドラゴン"],
        notVeryEffective: ["ほのお", "みず", "こおり", "はがね"],
    },

    かくとう: {
        superEffective: ["ノーマル", "こおり", "いわ", "あく", "はがね"],
        notVeryEffective: ["どく", "ひこう", "エスパー", "むし", "フェアリー"],
        noEffect: ["ゴースト"],
    },

    どく: {
        superEffective: ["くさ", "フェアリー"],
        notVeryEffective: ["どく", "じめん", "いわ", "ゴースト"],
        noEffect: ["はがね"],
    },

    じめん: {
        superEffective: ["ほのお", "でんき", "どく", "いわ", "はがね"],
        notVeryEffective: ["くさ", "むし"],
        noEffect: ["ひこう"],
    },

    ひこう: {
        superEffective: ["くさ", "かくとう", "むし"],
        notVeryEffective: ["でんき", "いわ", "はがね"],
    },

    エスパー: {
        superEffective: ["かくとう", "どく"],
        notVeryEffective: ["エスパー", "はがね"],
        noEffect: ["あく"],
    },

    むし: {
        superEffective: ["くさ", "エスパー", "あく"],
        notVeryEffective: [
            "ほのお",
            "かくとう",
            "どく",
            "ひこう",
            "ゴースト",
            "はがね",
            "フェアリー",
        ],
    },

    いわ: {
        superEffective: ["ほのお", "こおり", "ひこう", "むし"],
        notVeryEffective: ["かくとう", "じめん", "はがね"],
    },

    ゴースト: {
        superEffective: ["エスパー", "ゴースト"],
        notVeryEffective: ["あく"],
        noEffect: ["ノーマル"],
    },

    ドラゴン: {
        superEffective: ["ドラゴン"],
        notVeryEffective: ["はがね"],
        noEffect: ["フェアリー"],
    },

    あく: {
        superEffective: ["エスパー", "ゴースト"],
        notVeryEffective: ["かくとう", "あく", "フェアリー"],
    },

    はがね: {
        superEffective: ["こおり", "いわ", "フェアリー"],
        notVeryEffective: ["ほのお", "みず", "でんき", "はがね"],
    },

    フェアリー: {
        superEffective: ["かくとう", "ドラゴン", "あく"],
        notVeryEffective: ["ほのお", "どく", "はがね"],
    },
};

/**
 * 攻撃タイプ1つ × 防御タイプ1つの倍率を返す。
 */
export function getSingleTypeMultiplier(
    attackType: PokemonType,
    defenseType: PokemonType
): number {
    const effectiveness = TYPE_EFFECTIVENESS[attackType];

    if (effectiveness.noEffect?.includes(defenseType)) {
        return 0;
    }

    if (effectiveness.superEffective?.includes(defenseType)) {
        return 2;
    }

    if (effectiveness.notVeryEffective?.includes(defenseType)) {
        return 0.5;
    }

    return 1;
}