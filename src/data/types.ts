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

/*export type DefensiveAbilityEffect = {
    kind: "attackTypeMultiplier";
    affectedAttackTypes: PokemonType[];
    multiplier: number;
};*/

export type AttackStyle = "物理" | "特殊" | "両刀" | "補助" | "不明";
export type DefensiveAbilityEffect =
    | { kind: "huyuu"; label: "ふゆう"; ignoredByMoldBreaker: true; }
    | { kind: "unaginobori"; label: "うなぎのぼり"; ignoredByMoldBreaker: true; }
    | { kind: "atuisibou"; label: "あついしぼう"; ignoredByMoldBreaker: true; }
    | { kind: "tyosui"; label: "ちょすい"; ignoredByMoldBreaker: true; }
    | { kind: "hideri"; label: "ひでり"; ignoredByMoldBreaker: true; }
    | { kind: "amehurasi"; label: "あめふらし"; ignoredByMoldBreaker: true; }
    | { kind: "hiraisinn"; label: "ひらいしん"; ignoredByMoldBreaker: true; }
    | { kind: "tikudenn"; label: "ちくでん"; ignoredByMoldBreaker: false; }
    | { kind: "tainetu"; label: "たいねつ"; ignoredByMoldBreaker: true; }
    | { kind: "soushoku"; label: "そうしょく"; ignoredByMoldBreaker: true; }
    | { kind: "feari-o-ra"; label: "フェアリーオーラ"; ignoredByMoldBreaker: true; }
    | { kind: "moraibi"; label: "もらいび"; ignoredByMoldBreaker: true; };
export type PokemonData = {
    id: string;
    name: string;
    types: PokemonType[];
    attackStyle?: AttackStyle;

    formLabel?: string;
    searchKeywords: string[];

    ability?: string;
    defensiveAbilityEffect?: DefensiveAbilityEffect;
    canUseMoldBreaker?: boolean;

    subAttackTypes?: PokemonType[];

    imageUrl?: string;
};