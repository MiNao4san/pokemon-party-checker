import { POKEMON_TYPES } from "../data/types";
import type { PokemonData, PokemonType } from "../data/types";
import {
    classifyMultiplier,
    getFinalDefenseMultiplier,
    getTypeMultiplier,
    type MatchupCategory,
} from "./matchup";

export type AnalysisDetail = {
    pokemonId: string;
    pokemonName: string;
    usedType: PokemonType;
    multiplier: number;
    category: MatchupCategory;
};

export type DefenseAnalysisResult = {
    targetTypes: PokemonType[];
    details: AnalysisDetail[];
    superEffectiveCount: number;
    neutralCount: number;
    notVeryEffectiveCount: number;
    noEffectCount: number;
};

export type OffenseAnalysisResult = {
    targetTypes: PokemonType[];
    details: AnalysisDetail[];
    superEffectiveCount: number;
    neutralOrBetterCount: number;
    notVeryEffectiveCount: number;
    noEffectCount: number;
};

function getTypeCombinations(): PokemonType[][] {
    const combinations: PokemonType[][] = [];

    for (let i = 0; i < POKEMON_TYPES.length; i++) {
        for (let j = i + 1; j < POKEMON_TYPES.length; j++) {
            combinations.push([POKEMON_TYPES[i], POKEMON_TYPES[j]]);
        }
    }

    return combinations;
}

function countDefenseDetails(details: AnalysisDetail[]) {
    return {
        superEffectiveCount: details.filter((d) => d.category === "抜群").length,
        neutralCount: details.filter((d) => d.category === "等倍").length,
        notVeryEffectiveCount: details.filter((d) => d.category === "半減以下")
            .length,
        noEffectCount: details.filter((d) => d.category === "無効").length,
    };
}

function countOffenseDetails(details: AnalysisDetail[]) {
    return {
        superEffectiveCount: details.filter((d) => d.category === "抜群").length,
        neutralOrBetterCount: details.filter(
            (d) => d.category === "等倍" || d.category === "抜群"
        ).length,
        notVeryEffectiveCount: details.filter((d) => d.category === "半減以下")
            .length,
        noEffectCount: details.filter((d) => d.category === "無効").length,
    };
}

function sortDefenseResults(
    results: DefenseAnalysisResult[]
): DefenseAnalysisResult[] {
    return [...results].sort((a, b) => {
        return (
            b.superEffectiveCount - a.superEffectiveCount ||
            a.notVeryEffectiveCount - b.notVeryEffectiveCount ||
            a.noEffectCount - b.noEffectCount ||
            b.neutralCount - a.neutralCount
        );
    });
}

function sortOffenseResults(
    results: OffenseAnalysisResult[]
): OffenseAnalysisResult[] {
    return [...results].sort((a, b) => {
        return (
            a.superEffectiveCount - b.superEffectiveCount ||
            a.neutralOrBetterCount - b.neutralOrBetterCount ||
            b.notVeryEffectiveCount - a.notVeryEffectiveCount ||
            b.noEffectCount - a.noEffectCount
        );
    });
}

function getBestDefenseDetail(
    pokemon: PokemonData,
    attackTypes: PokemonType[]
): AnalysisDetail {
    const candidates = attackTypes.map((attackType) => {
        const multiplier = getFinalDefenseMultiplier({
            attackType,
            defenseTypes: pokemon.types,
            defensiveAbilityEffect: pokemon.defensiveAbilityEffect,
        });

        return {
            pokemonId: pokemon.id,
            pokemonName: pokemon.name,
            usedType: attackType,
            multiplier,
            category: classifyMultiplier(multiplier),
        };
    });

    return candidates.reduce((best, current) => {
        return current.multiplier > best.multiplier ? current : best;
    });
}

function getPokemonAttackTypes(pokemon: PokemonData): PokemonType[] {
    return Array.from(
        new Set([...pokemon.types, ...(pokemon.subAttackTypes ?? [])])
    );
}

function getBestOffenseDetail(
    pokemon: PokemonData,
    defenseTypes: PokemonType[]
): AnalysisDetail {
    const attackTypes = getPokemonAttackTypes(pokemon);

    const candidates = attackTypes.map((attackType) => {
        const multiplier = getTypeMultiplier(attackType, defenseTypes);

        return {
            pokemonId: pokemon.id,
            pokemonName: pokemon.name,
            usedType: attackType,
            multiplier,
            category: classifyMultiplier(multiplier),
        };
    });

    return candidates.reduce((best, current) => {
        return current.multiplier > best.multiplier ? current : best;
    });
}

export function analyzeDefenseSingleTypes(
    party: PokemonData[]
): DefenseAnalysisResult[] {
    const results = POKEMON_TYPES.map((attackType) => {
        const details = party.map((pokemon) =>
            getBestDefenseDetail(pokemon, [attackType])
        );

        return {
            targetTypes: [attackType],
            details,
            ...countDefenseDetails(details),
        };
    });

    return sortDefenseResults(results);
}

export function analyzeDefenseDualTypes(
    party: PokemonData[]
): DefenseAnalysisResult[] {
    const results = getTypeCombinations().map((attackTypes) => {
        const details = party.map((pokemon) =>
            getBestDefenseDetail(pokemon, attackTypes)
        );

        return {
            targetTypes: attackTypes,
            details,
            ...countDefenseDetails(details),
        };
    });

    return sortDefenseResults(results);
}

export function analyzeOffenseSingleTypes(
    party: PokemonData[]
): OffenseAnalysisResult[] {
    const results = POKEMON_TYPES.map((defenseType) => {
        const details = party.map((pokemon) =>
            getBestOffenseDetail(pokemon, [defenseType])
        );

        return {
            targetTypes: [defenseType],
            details,
            ...countOffenseDetails(details),
        };
    });

    return sortOffenseResults(results);
}

export function analyzeOffenseDualTypes(
    party: PokemonData[]
): OffenseAnalysisResult[] {
    const results = getTypeCombinations().map((defenseTypes) => {
        const details = party.map((pokemon) =>
            getBestOffenseDetail(pokemon, defenseTypes)
        );

        return {
            targetTypes: defenseTypes,
            details,
            ...countOffenseDetails(details),
        };
    });

    return sortOffenseResults(results);
}