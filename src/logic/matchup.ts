import type { PokemonType, DefensiveAbilityEffect } from "../data/types";
import { getSingleTypeMultiplier } from "../data/typeChart2";

export type MatchupCategory = "無効" | "半減以下" | "等倍" | "抜群";

/**
 * 攻撃タイプ1つに対して、防御側のタイプが複数ある場合の倍率を返す。
 *
 * 例：
 * ほのお → くさ / どく
 * = ほのお → くさ 2倍 × ほのお → どく 1倍
 * = 2倍
 */
export function getTypeMultiplier(
    attackType: PokemonType,
    defenseTypes: PokemonType[]
): number {
    return defenseTypes.reduce((totalMultiplier, defenseType) => {
        return totalMultiplier * getSingleTypeMultiplier(attackType, defenseType);
    }, 1);
}

/**
 * 特性による防御補正を反映する。
 *
 * 初期実装では、
 * 「特定の攻撃タイプに対する倍率変更」だけ扱う。
 *
 * 例：
 * あついしぼう：ほのお・こおりを0.5倍
 * ふゆう：じめんを0倍
 * もふもふ：ほのおを2倍
 */
export function applyDefensiveAbilityEffect(
    _attackType: PokemonType,
    baseMultiplier: number,
    _defensiveAbilityEffect?: DefensiveAbilityEffect
): number {
    return baseMultiplier;
}
/**
 * タイプ相性と特性補正を合わせた最終倍率を返す。
 */
export function getFinalDefenseMultiplier(params: {
    attackType: PokemonType;
    defenseTypes: PokemonType[];
    defensiveAbilityEffect?: DefensiveAbilityEffect;
}): number {
    const baseMultiplier = getTypeMultiplier(
        params.attackType,
        params.defenseTypes
    );

    return applyDefensiveAbilityEffect(
        params.attackType,
        baseMultiplier,
        params.defensiveAbilityEffect
    );
}

/**
 * 倍率を表示用カテゴリに分類する。
 */
export function classifyMultiplier(multiplier: number): MatchupCategory {
    if (multiplier === 0) {
        return "無効";
    }

    if (multiplier > 0 && multiplier < 1) {
        return "半減以下";
    }

    if (multiplier === 1) {
        return "等倍";
    }

    return "抜群";
}