export const POKEMON_TYPES = [
    "ノーマル",
    "ほのお",
    "みず",
    "でんき",
    "くさ",
    "こおり",
    "かくとう",
    "どく",
    "じめん",
    "ひこう",
    "エスパー",
    "むし",
    "いわ",
    "ゴースト",
    "ドラゴン",
    "あく",
    "はがね",
    "フェアリー",
] as const;

export type PokemonType = typeof POKEMON_TYPES[number];

export function isPokemonType(value: string): value is PokemonType {
    return POKEMON_TYPES.includes(value as PokemonType);
}

export type DefensiveAbilityEffect = {
    kind: "attackTypeMultiplier";
    affectedAttackTypes: PokemonType[];
    multiplier: number;
};

export type AttackStyle = "物理" | "特殊" | "両刀" | "補助" | "不明";
export type PokemonData = {
    id: string;
    name: string;
    types: PokemonType[];
    attackStyle?: AttackStyle;

    formLabel?: string;
    searchKeywords: string[];

    ability?: string;
    defensiveAbilityEffect?: DefensiveAbilityEffect;

    subAttackTypes?: PokemonType[];

    imageUrl?: string;
};