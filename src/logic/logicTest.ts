import { pokemonData } from "../data/pokemonData";
import {
    analyzeDefenseSingleTypes,
    analyzeDefenseDualTypes,
    analyzeOffenseSingleTypes,
    analyzeOffenseDualTypes,
} from "./analysis";

const party = pokemonData.filter((pokemon) =>
    [
        "mega-venusaur",
        "heatran",
        "dragonite",
        "rotom-wash",
        "gyarados",
        "mega-charizard-x",
    ].includes(pokemon.id)
);

console.log("パーティ:");
console.table(
    party.map((pokemon) => ({
        name: pokemon.name,
        types: pokemon.types.join(" / "),
        ability: pokemon.ability ?? "-",
        subAttackTypes: pokemon.subAttackTypes?.join(" / ") ?? "-",
    }))
);

console.log("防御面：単タイプ攻撃 上位10件");
console.table(
    analyzeDefenseSingleTypes(party).slice(0, 10).map((result) => ({
        types: result.targetTypes.join(" + "),
        抜群: result.superEffectiveCount,
        等倍: result.neutralCount,
        半減以下: result.notVeryEffectiveCount,
        無効: result.noEffectCount,
    }))
);

console.log("防御面：2タイプ攻撃範囲 上位10件");
console.table(
    analyzeDefenseDualTypes(party).slice(0, 10).map((result) => ({
        types: result.targetTypes.join(" + "),
        抜群: result.superEffectiveCount,
        等倍: result.neutralCount,
        半減以下: result.notVeryEffectiveCount,
        無効: result.noEffectCount,
    }))
);

console.log("攻撃面：単タイプ防御 上位10件");
console.table(
    analyzeOffenseSingleTypes(party).slice(0, 10).map((result) => ({
        types: result.targetTypes.join(" + "),
        抜群を取れる: result.superEffectiveCount,
        等倍以上: result.neutralOrBetterCount,
        半減以下: result.notVeryEffectiveCount,
        無効: result.noEffectCount,
    }))
);

console.log("攻撃面：2タイプ防御 上位10件");
console.table(
    analyzeOffenseDualTypes(party).slice(0, 10).map((result) => ({
        types: result.targetTypes.join(" + "),
        抜群を取れる: result.superEffectiveCount,
        等倍以上: result.neutralOrBetterCount,
        半減以下: result.notVeryEffectiveCount,
        無効: result.noEffectCount,
    }))
);