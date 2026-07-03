import { useMemo, useState, type CSSProperties } from "react";
import { pokemonData } from "./data/pokemonData";
import { moveData } from "./data/moveData";
import type { MoveData } from "./data/moveData";
import { POKEMON_TYPES } from "./data/types";
import type { PokemonData, PokemonType } from "./data/types";
import {
  analyzeDefenseSingleTypes,
  type DefenseAnalysisResult,
} from "./logic/analysis";
import {
  classifyMultiplier,
  getTypeMultiplier,
} from "./logic/matchup";

const SLOT_COUNT = 6;
const MAX_MOVE_COUNT = 4;
const TOP_RESULT_COUNT = 10;

type SummaryMode = "defense" | "offense";
type MatchupCategory = "無効" | "半減以下" | "等倍" | "抜群";

type PartySlot = {
  pokemon: PokemonData | null;
  moves: MoveData[];
  defensiveAbilityEnabled: boolean;
  moldBreakerEnabled: boolean;
};

function createEmptySlot(): PartySlot {
  return {
    pokemon: null,
    moves: [],
    defensiveAbilityEnabled: true,
    moldBreakerEnabled: false,
  };
}

type MoveEditor = {
  slotIndex: number;
  moveSlotIndex: number;
  query: string;
} | null;

type AnalysisDetailWithMove = {
  pokemonId: string;
  pokemonName: string;
  usedType: PokemonType;
  multiplier: number;
  category: MatchupCategory;
  moveName?: string;
  isFallback?: boolean;
};

type OffenseAnalysisResult = {
  targetTypes: PokemonType[];
  details: AnalysisDetailWithMove[];
  superEffectiveCount: number;
  neutralOrBetterCount: number;
  notVeryEffectiveCount: number;
  noEffectCount: number;
};

type DefensePokemonThreat = {
  pokemon: PokemonData;
  details: AnalysisDetailWithMove[];
  superEffectiveCount: number;
  neutralCount: number;
  notVeryEffectiveCount: number;
  noEffectCount: number;
};

type OffensePokemonProblem = {
  pokemon: PokemonData;
  details: AnalysisDetailWithMove[];
  superEffectiveCount: number;
  neutralOrBetterCount: number;
  notVeryEffectiveCount: number;
  noEffectCount: number;
};

const samplePartyIds = [
  "sazanndora",
  "mega-metagurosu",
  "mimikkyu",
  "mega-mafokusi-",
  "asire-nu",
  "buirijurasu"
];

const TYPE_STYLES: Record<
  PokemonType,
  {
    background: string;
    text: string;
  }
> = {
  ノーマル: { background: "#9ca3af", text: "#ffffff" },
  ほのお: { background: "#f97316", text: "#ffffff" },
  みず: { background: "#3b82f6", text: "#ffffff" },
  でんき: { background: "#facc15", text: "#172033" },
  くさ: { background: "#22c55e", text: "#ffffff" },
  こおり: { background: "#38bdf8", text: "#172033" },
  かくとう: { background: "#dc2626", text: "#ffffff" },
  どく: { background: "#a855f7", text: "#ffffff" },
  じめん: { background: "#b45309", text: "#ffffff" },
  ひこう: { background: "#60a5fa", text: "#172033" },
  エスパー: { background: "#ec4899", text: "#ffffff" },
  むし: { background: "#84cc16", text: "#172033" },
  いわ: { background: "#78716c", text: "#ffffff" },
  ゴースト: { background: "#6366f1", text: "#ffffff" },
  ドラゴン: { background: "#7c3aed", text: "#ffffff" },
  あく: { background: "#334155", text: "#ffffff" },
  はがね: { background: "#64748b", text: "#ffffff" },
  フェアリー: { background: "#f472b6", text: "#172033" },
};

function App() {
  const [partySlots, setPartySlots] = useState<PartySlot[]>(
    Array.from({ length: SLOT_COUNT }, () => createEmptySlot())
  );
  const hasAnySelectedMove = partySlots.some((slot) => slot.moves.length > 0);

  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);
  const [modalQuery, setModalQuery] = useState("");
  const [selectedTypeFilters, setSelectedTypeFilters] = useState<PokemonType[]>(
    []
  );

  const [moveEditor, setMoveEditor] = useState<MoveEditor>(null);
  const [summaryMode, setSummaryMode] = useState<SummaryMode>("defense");

  const party = partySlots
    .map((slot) => slot.pokemon)
    .filter((pokemon): pokemon is PokemonData => pokemon !== null);

  const duplicateNames = useMemo(() => {
    const counts = new Map<string, number>();

    for (const pokemon of party) {
      counts.set(pokemon.id, (counts.get(pokemon.id) ?? 0) + 1);
    }

    return party
      .filter((pokemon) => (counts.get(pokemon.id) ?? 0) > 1)
      .map((pokemon) => pokemon.name)
      .filter((name, index, array) => array.indexOf(name) === index);
  }, [party]);

  const defenseSingle = useMemo(
    () => (party.length >= 2 ? analyzeDefenseSingleTypes(party) : []),
    [party]
  );

  const offenseSingle = useMemo(
    () =>
      party.length >= 2 ? analyzeOffenseSingleTypesFromSlots(partySlots) : [],
    [partySlots, party.length]
  );

  const opponentPool = useMemo(() => {
    const partyIds = new Set(party.map((pokemon) => pokemon.id));
    return pokemonData.filter((pokemon) => !partyIds.has(pokemon.id));
  }, [party]);

  const defenseThreats = useMemo(
    () =>
      party.length >= 2
        ? analyzeDefenseThreatPokemon(partySlots, opponentPool)
        : [],
    [partySlots, opponentPool, party.length]
  );

  const offenseProblems = useMemo(
    () =>
      party.length >= 2
        ? analyzeOffenseProblemPokemon(partySlots, opponentPool)
        : [],
    [partySlots, opponentPool, party.length]
  );

  const candidates = useMemo(() => {
    return getSearchCandidates(modalQuery, selectedTypeFilters);
  }, [modalQuery, selectedTypeFilters]);

  const inlineMoveCandidates = useMemo(() => {
    if (!moveEditor) {
      return [];
    }

    const targetPokemon = partySlots[moveEditor.slotIndex]?.pokemon ?? undefined;

    return getMoveCandidates(moveEditor.query, targetPokemon);
  }, [moveEditor, partySlots]);

  function openPokemonModal(slotIndex: number) {
    setActiveSlotIndex(slotIndex);
    setModalQuery("");
    setSelectedTypeFilters([]);
    setMoveEditor(null);
  }

  function closePokemonModal() {
    setActiveSlotIndex(null);
    setModalQuery("");
    setSelectedTypeFilters([]);
  }

  function selectPokemon(pokemon: PokemonData) {
    if (activeSlotIndex === null) {
      return;
    }

    setPartySlots((current) => {
      const next = [...current];

      next[activeSlotIndex] = {
        pokemon,
        moves: [],
        defensiveAbilityEnabled: true,
        moldBreakerEnabled: false,
      };

      return next;
    });

    closePokemonModal();
  }

  function clearSlot(slotIndex: number) {
    setPartySlots((current) => {
      const next = [...current];

      next[slotIndex] = createEmptySlot();

      return next;
    });

    if (moveEditor?.slotIndex === slotIndex) {
      setMoveEditor(null);
    }
  }

  function toggleDefensiveAbility(slotIndex: number) {
    setPartySlots((current) =>
      current.map((slot, index) => {
        if (index !== slotIndex) {
          return slot;
        }

        return {
          ...slot,
          defensiveAbilityEnabled: !slot.defensiveAbilityEnabled,
        };
      })
    );
  }

  function toggleMoldBreaker(slotIndex: number) {
    setPartySlots((current) =>
      current.map((slot, index) => {
        if (index !== slotIndex) {
          return slot;
        }

        return {
          ...slot,
          moldBreakerEnabled: !slot.moldBreakerEnabled,
        };
      })
    );
  }

  function setSampleParty() {
    const sampleSlots = samplePartyIds
      .map((id) => ({
        pokemon: pokemonData.find((pokemon) => pokemon.id === id) ?? null,
        moves: [],
        defensiveAbilityEnabled: true,
        moldBreakerEnabled: false,
      }))
      .slice(0, SLOT_COUNT);

    setPartySlots([
      ...sampleSlots,
      ...Array.from({ length: SLOT_COUNT - sampleSlots.length }, () =>
        createEmptySlot()
      ),
    ]);
    setMoveEditor(null);
  }

  function clearAll() {
    setPartySlots(Array.from({ length: SLOT_COUNT }, () => createEmptySlot()));
    setMoveEditor(null);
  }

  function toggleTypeFilter(type: PokemonType) {
    setSelectedTypeFilters((current) =>
      current.includes(type)
        ? current.filter((currentType) => currentType !== type)
        : [...current, type]
    );
  }

  function clearTypeFilters() {
    setSelectedTypeFilters([]);
  }

  function startMoveEdit(slotIndex: number, moveSlotIndex: number) {
    setMoveEditor({
      slotIndex,
      moveSlotIndex,
      query: "",
    });
  }

  function cancelMoveEdit() {
    setMoveEditor(null);
  }

  function updateMoveQuery(value: string) {
    setMoveEditor((current) =>
      current
        ? {
          ...current,
          query: value,
        }
        : current
    );
  }

  function addMoveToSlot(move: MoveData) {
    if (!moveEditor) {
      return;
    }

    setPartySlots((current) => {
      const next = [...current];
      const targetSlot = next[moveEditor.slotIndex];

      if (!targetSlot.pokemon) {
        return current;
      }

      if (targetSlot.moves.some((currentMove) => currentMove.id === move.id)) {
        return current;
      }

      if (targetSlot.moves.length >= MAX_MOVE_COUNT) {
        return current;
      }

      const nextMoves = [...targetSlot.moves];
      nextMoves.splice(moveEditor.moveSlotIndex, 0, move);

      next[moveEditor.slotIndex] = {
        ...targetSlot,
        moves: nextMoves.slice(0, MAX_MOVE_COUNT),
      };

      return next;
    });

    setMoveEditor(null);
  }

  function removeMoveFromSlot(slotIndex: number, moveId: string) {
    setPartySlots((current) => {
      const next = [...current];
      const targetSlot = next[slotIndex];

      next[slotIndex] = {
        ...targetSlot,
        moves: targetSlot.moves.filter((move) => move.id !== moveId),
      };

      return next;
    });
  }

  return (
    <main className="app">
      <header className="appHeader">
        <div>
          <h1>ポケモン パーティ相性分析</h1>
          <p className="lead">
            2〜6体を選ぶと、タイプ相性の観点から防御面・攻撃面を自動分析します。
          </p>
        </div>
      </header>

      <section className="partySection compactPartySection">
        <div className="buttonRow compactActionRow">
          <button type="button" className="subButton" onClick={setSampleParty}>
            サンプルを入れる
          </button>
          <button type="button" className="subButton" onClick={clearAll}>
            全クリア
          </button>
        </div>

        <div className="partyGrid movePartyGrid compactPartyGrid">
          {partySlots.map((slot, index) => (
            <PartySlotCard
              key={index}
              slotIndex={index}
              slot={slot}
              moveEditor={moveEditor}
              moveCandidates={inlineMoveCandidates}
              onOpenPokemon={() => openPokemonModal(index)}
              onClear={() => clearSlot(index)}
              onToggleDefensiveAbility={() => toggleDefensiveAbility(index)}
              onToggleMoldBreaker={() => toggleMoldBreaker(index)}
              onStartMoveEdit={(moveSlotIndex) => startMoveEdit(index, moveSlotIndex)}
              onCancelMoveEdit={cancelMoveEdit}
              onMoveQueryChange={updateMoveQuery}
              onSelectMove={(move) => addMoveToSlot(move)}
              onRemoveMove={(moveId) => removeMoveFromSlot(index, moveId)}
            />
          ))}
        </div>
      </section>

      <section className="messages">
        {party.length < 2 && (
          <p className="infoMessage">
            2体以上選択すると分析結果が表示されます。
          </p>
        )}

        {duplicateNames.length > 0 && (
          <p className="warningMessage">
            同じポケモンが複数選択されています：
            {duplicateNames.join("、")}
          </p>
        )}
      </section>

      {party.length >= 2 && (
        <section className="results">
          <h2>分析結果</h2>

          <SummaryModeSwitch mode={summaryMode} onChange={setSummaryMode} />

          {summaryMode === "defense" ? (
            <>
              <TypeResistanceSummary
                partySize={party.length}
                defenseSingle={defenseSingle}
              />

              <DefenseThreatPokemonList results={defenseThreats} />
            </>
          ) : hasAnySelectedMove ? (
            <>
              <OffenseCoverageSummary
                partySize={party.length}
                offenseSingle={offenseSingle}
              />

              <OffenseProblemPokemonList results={offenseProblems} />
            </>
          ) : (
            <OffenseNeedMoveMessage />
          )}
        </section>
      )}

      {activeSlotIndex !== null && (
        <PokemonSelectModal
          query={modalQuery}
          selectedTypeFilters={selectedTypeFilters}
          candidates={candidates}
          onQueryChange={setModalQuery}
          onToggleTypeFilter={toggleTypeFilter}
          onClearTypeFilters={clearTypeFilters}
          onSelect={selectPokemon}
          onClose={closePokemonModal}
        />
      )}
    </main>
  );
}

function PartySlotCard(props: {
  slotIndex: number;
  slot: PartySlot;
  moveEditor: MoveEditor;
  moveCandidates: MoveData[];
  onOpenPokemon: () => void;
  onClear: () => void;
  onToggleDefensiveAbility: () => void;
  onToggleMoldBreaker: () => void;
  onStartMoveEdit: (moveSlotIndex: number) => void;
  onCancelMoveEdit: () => void;
  onMoveQueryChange: (value: string) => void;
  onSelectMove: (move: MoveData) => void;
  onRemoveMove: (moveId: string) => void;
}) {
  if (!props.slot.pokemon) {
    return (
      <div className="partySlot emptySlot">
        <button
          type="button"
          className="emptySlotButton"
          onClick={props.onOpenPokemon}
        >
          <span className="emptySlotPlus">＋</span>
          <span className="emptySlotIndex">{props.slotIndex + 1}体目</span>
          <span className="emptySlotText">ポケモンを選ぶ</span>
        </button>
      </div>
    );
  }

  const pokemon = props.slot.pokemon;

  const isEditingThisSlot =
    props.moveEditor !== null &&
    props.moveEditor.slotIndex === props.slotIndex;

  const selectedMoveIds = new Set(props.slot.moves.map((move) => move.id));

  return (
    <div className="partySlot filledSlot moveEnabledSlot">
      <div
        className="slotPokemonArea editablePokemonArea"
        onClick={props.onOpenPokemon}
        title="ポケモンを変更"
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            props.onOpenPokemon();
          }
        }}
      >
        {pokemon.imageUrl ? (
          <img
            className="slotPokemonImage"
            src={pokemon.imageUrl}
            alt={pokemon.name}
          />
        ) : (
          <div className="slotPokemonPlaceholder">
            {pokemon.name.slice(0, 1)}
          </div>
        )}

        <span className="slotPokemonText">
          <span className="pokemonName">{pokemon.name}</span>

          <span className="typeRow">
            {pokemon.types.map((type) => (
              <TypeBadge key={type} type={type} />
            ))}
          </span>

          {pokemon.defensiveAbilityEffect && (
            <button
              type="button"
              className={
                props.slot.defensiveAbilityEnabled
                  ? "abilityToggle active"
                  : "abilityToggle"
              }
              onClick={(event) => {
                event.stopPropagation();
                props.onToggleDefensiveAbility();
              }}
            >
              {pokemon.defensiveAbilityEffect.label}
              {props.slot.defensiveAbilityEnabled ? " ON" : " OFF"}
            </button>
          )}

          {pokemon.canUseMoldBreaker && (
            <button
              type="button"
              className={
                props.slot.moldBreakerEnabled
                  ? "abilityToggle moldBreakerToggle active"
                  : "abilityToggle moldBreakerToggle"
              }
              onClick={(event) => {
                event.stopPropagation();
                props.onToggleMoldBreaker();
              }}
            >
              かたやぶり
              {props.slot.moldBreakerEnabled ? " ON" : " OFF"}
            </button>
          )}
        </span>
      </div>

      <div className="slotCardMain">
        <div className="moveSlotPanel inlineMoveSlotPanel">
          <div className="moveSlotHeader">
            <span>技</span>
          </div>

          <div className="moveSlotGrid inlineMoveSlotGrid">
            {Array.from({ length: MAX_MOVE_COUNT }).map((_, index) => {
              const move = props.slot.moves[index];

              const isEditingThisMove =
                props.moveEditor !== null &&
                props.moveEditor.slotIndex === props.slotIndex &&
                props.moveEditor.moveSlotIndex === index;

              if (move) {
                return (
                  <div className="selectedMoveBar" key={move.id}>
                    <span className="selectedMoveName">{move.name}</span>
                    <TypeBadge type={move.type} />

                    <button
                      type="button"
                      className="removeMoveButton"
                      onClick={() => props.onRemoveMove(move.id)}
                    >
                      ×
                    </button>
                  </div>
                );
              }

              if (isEditingThisMove) {
                return (
                  <div className="inlineMoveSearchBox" key="editing">
                    <input
                      autoFocus
                      value={props.moveEditor?.query ?? ""}
                      placeholder="技名で検索..."
                      onChange={(event) =>
                        props.onMoveQueryChange(event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Escape") {
                          props.onCancelMoveEdit();
                        }

                        if (
                          event.key === "Enter" &&
                          props.moveCandidates.length > 0
                        ) {
                          const firstMove = props.moveCandidates.find(
                            (candidate) => !selectedMoveIds.has(candidate.id)
                          );

                          if (firstMove) {
                            props.onSelectMove(firstMove);
                          }
                        }
                      }}
                    />

                    <button
                      type="button"
                      className="inlineMoveCancelButton"
                      onClick={props.onCancelMoveEdit}
                    >
                      ×
                    </button>
                  </div>
                );
              }

              return (
                <button
                  type="button"
                  className="addMoveButton"
                  key={index}
                  onClick={() => props.onStartMoveEdit(index)}
                  disabled={props.slot.moves.length >= MAX_MOVE_COUNT}
                >
                  ＋ 技を追加
                </button>
              );
            })}
          </div>

          {isEditingThisSlot && (
            <InlineMoveCandidateList
              candidates={props.moveCandidates}
              selectedMoveIds={selectedMoveIds}
              onSelectMove={props.onSelectMove}
            />
          )}
        </div>
      </div>

      {!isEditingThisSlot && (
        <div className="slotActions moveSlotActions">
          <button
            type="button"
            className="deleteSlotButton"
            onClick={props.onClear}
            aria-label={`${pokemon.name}を削除`}
            title="削除"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

function InlineMoveCandidateList(props: {
  candidates: MoveData[];
  selectedMoveIds: Set<string>;
  onSelectMove: (move: MoveData) => void;
}) {
  return (
    <div className="inlineMoveCandidateList">
      {props.candidates.length > 0 ? (
        props.candidates.map((move) => {
          const alreadySelected = props.selectedMoveIds.has(move.id);

          return (
            <button
              type="button"
              key={move.id}
              className="inlineMoveCandidateBar"
              onClick={() => props.onSelectMove(move)}
              disabled={alreadySelected}
            >
              <span className="inlineMoveCandidateName">{move.name}</span>
              <TypeBadge type={move.type} />
              <span className="inlineMoveCandidateStatus">
                {alreadySelected ? "選択済み" : "追加"}
              </span>
            </button>
          );
        })
      ) : (
        <div className="inlineMoveEmptyMessage">
          該当する技が見つかりません。
        </div>
      )}
    </div>
  );
}

function PokemonSelectModal(props: {
  query: string;
  selectedTypeFilters: PokemonType[];
  candidates: PokemonData[];
  onQueryChange: (value: string) => void;
  onToggleTypeFilter: (type: PokemonType) => void;
  onClearTypeFilters: () => void;
  onSelect: (pokemon: PokemonData) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="modalBackdrop pokemonModalBackdrop layeredPokemonModalBackdrop"
      onMouseDown={props.onClose}
    >
      <section
        className="modal pokemonSelectModal layeredPokemonSelectModal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modalSearchArea compactModalSearchArea">
          <div className="pokemonSearchShell">
            <input
              autoFocus
              className="pokemonSearchInput"
              value={props.query}
              placeholder="名前で検索..."
              onChange={(event) => props.onQueryChange(event.target.value)}
            />

            <button
              type="button"
              className="searchCancelButton"
              onClick={props.onClose}
            >
              キャンセル
            </button>
          </div>

          <div className="typeFilterGrid compactTypeFilterGrid">
            {POKEMON_TYPES.map((type) => {
              const isSelected = props.selectedTypeFilters.includes(type);

              return (
                <button
                  type="button"
                  key={type}
                  className={
                    isSelected
                      ? "typeFilter compactTypeFilter selected"
                      : "typeFilter compactTypeFilter"
                  }
                  style={
                    {
                      "--type-bg": TYPE_STYLES[type].background,
                      "--type-text": TYPE_STYLES[type].text,
                    } as CSSProperties
                  }
                  onClick={() => props.onToggleTypeFilter(type)}
                >
                  {type}
                </button>
              );
            })}
          </div>

          {props.selectedTypeFilters.length > 0 && (
            <button
              type="button"
              className="clearTypeFilterButton"
              onClick={props.onClearTypeFilters}
            >
              タイプ解除
            </button>
          )}
        </div>

        <div className="candidateGrid">
          {props.candidates.length > 0 ? (
            props.candidates.map((pokemon) => (
              <button
                type="button"
                key={pokemon.id}
                className="pokemonCandidateCard imageOnlyCandidateCard"
                onClick={() => props.onSelect(pokemon)}
              >
                {pokemon.imageUrl ? (
                  <img
                    className="candidatePokemonImage"
                    src={pokemon.imageUrl}
                    alt={pokemon.name}
                  />
                ) : (
                  <div className="candidateImagePlaceholder">
                    {pokemon.name.slice(0, 1)}
                  </div>
                )}

                <strong>{pokemon.name}</strong>
              </button>
            ))
          ) : (
            <div className="emptyCandidateMessage">
              該当するポケモンが見つかりません。
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function SummaryModeSwitch(props: {
  mode: SummaryMode;
  onChange: (mode: SummaryMode) => void;
}) {
  return (
    <div
      className="summaryModeSwitch"
      role="tablist"
      aria-label="サマリー切り替え"
    >
      <button
        type="button"
        className={
          props.mode === "defense"
            ? "summaryModeButton active defenseActive"
            : "summaryModeButton"
        }
        onClick={() => props.onChange("defense")}
      >
        <span className="switchMainText">防御面</span>
        <span className="switchSubText">タイプ耐性を見る</span>
      </button>

      <button
        type="button"
        className={
          props.mode === "offense"
            ? "summaryModeButton active offenseActive"
            : "summaryModeButton"
        }
        onClick={() => props.onChange("offense")}
      >
        <span className="switchMainText">攻撃面</span>
        <span className="switchSubText">攻撃範囲を見る</span>
      </button>
    </div>
  );
}

function OffenseNeedMoveMessage() {
  return (
    <section className="offenseNeedMoveCard">
      <h3>攻撃面を分析できません</h3>
      <p>
        攻撃面は、選択した技のタイプをもとに分析します。
        少なくとも1つ技を追加してください。
      </p>
      <p className="offenseNeedMoveExample">
        例：ガブリアスに「じしん」、ミミッキュに「じゃれつく」など
      </p>
    </section>
  );
}

function TypeResistanceSummary(props: {
  partySize: number;
  defenseSingle: DefenseAnalysisResult[];
}) {
  const dangerThreshold = props.partySize <= 2 ? 1 : 2;

  const dangerTypes = props.defenseSingle.filter(
    (result) => result.superEffectiveCount >= dangerThreshold
  );

  const strongTypes = props.defenseSingle.filter(
    (result) => result.notVeryEffectiveCount + result.noEffectCount >= 2
  );

  return (
    <section className="typeSummaryCard">
      <div className="summaryTitle">
        <span className="accentBar" />
        <h3>タイプ耐性</h3>
      </div>

      <div className="summaryPanels">
        <div className="summaryPanel dangerPanel">
          <h4>● 注意すべきタイプ</h4>
          <p>複数体が弱点を持つタイプ。選出時は相性を意識しましょう。</p>

          <div className="summaryBadgeRow">
            {dangerTypes.length > 0 ? (
              dangerTypes.map((result) => (
                <TypeBadge
                  key={result.targetTypes.join("+")}
                  type={result.targetTypes[0]}
                />
              ))
            ) : (
              <span className="emptySummaryText">
                目立った弱点タイプはありません
              </span>
            )}
          </div>
        </div>

        <div className="summaryPanel strongPanel">
          <h4>● パーティの強み</h4>
          <p>2体以上が半減以下、または無効にできるタイプ。</p>

          <div className="summaryBadgeRow">
            {strongTypes.length > 0 ? (
              strongTypes.map((result) => (
                <TypeBadge
                  key={result.targetTypes.join("+")}
                  type={result.targetTypes[0]}
                />
              ))
            ) : (
              <span className="emptySummaryText">
                目立った耐性タイプはありません
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="typeResistanceGrid">
        {props.defenseSingle.map((result) => {
          const type = result.targetTypes[0];

          return (
            <div className="typeResistanceRow" key={type}>
              <div className="typeResistanceBar">
                <TypeBadge type={type} />
              </div>

              <div className="typeResistanceCounts">
                <span className="weakCount">
                  弱{result.superEffectiveCount}
                </span>
                <span className="resistCount">
                  耐{result.notVeryEffectiveCount}
                </span>
                <span className="immuneCount">無{result.noEffectCount}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function OffenseCoverageSummary(props: {
  partySize: number;
  offenseSingle: OffenseAnalysisResult[];
}) {
  const goodThreshold = props.partySize <= 2 ? 1 : 2;

  const hardToBreakTypes = props.offenseSingle.filter(
    (result) => result.superEffectiveCount === 0
  );

  const goodCoverageTypes = props.offenseSingle.filter(
    (result) => result.superEffectiveCount >= goodThreshold
  );

  return (
    <section className="offenseSummaryCard">
      <div className="summaryTitle offenseSummaryTitle">
        <span className="offenseAccentBar" />
        <h3>攻撃範囲</h3>
      </div>

      <div className="summaryPanels">
        <div className="summaryPanel offenseWeakPanel">
          <h4>● 抜群を取りづらいタイプ</h4>
          <p>
            パーティ内の選択技で、抜群を取れるポケモンがいないタイプ。
          </p>

          <div className="summaryBadgeRow">
            {hardToBreakTypes.length > 0 ? (
              hardToBreakTypes.map((result) => (
                <TypeBadge
                  key={result.targetTypes.join("+")}
                  type={result.targetTypes[0]}
                />
              ))
            ) : (
              <span className="emptySummaryText">
                抜群を取れない単タイプはありません
              </span>
            )}
          </div>
        </div>

        <div className="summaryPanel offenseStrongPanel">
          <h4>● 攻撃の通りが良いタイプ</h4>
          <p>複数体、または少人数パーティで抜群を取れるタイプ。</p>

          <div className="summaryBadgeRow">
            {goodCoverageTypes.length > 0 ? (
              goodCoverageTypes.map((result) => (
                <TypeBadge
                  key={result.targetTypes.join("+")}
                  type={result.targetTypes[0]}
                />
              ))
            ) : (
              <span className="emptySummaryText">
                目立って抜群を取りやすいタイプはありません
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="offenseCoverageGrid">
        {props.offenseSingle.map((result) => {
          const type = result.targetTypes[0];

          return (
            <div className="offenseCoverageRow" key={type}>
              <div className="offenseCoverageBar">
                <TypeBadge type={type} />
              </div>

              <div className="offenseCoverageCounts">
                <span className="superCount">
                  抜{result.superEffectiveCount}
                </span>
                <span className="neutralCount">
                  通{result.neutralOrBetterCount}
                </span>
                <span className="offenseResistedCount">
                  半{result.notVeryEffectiveCount}
                </span>
                <span className="offenseImmuneCount">
                  無{result.noEffectCount}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function DefenseThreatPokemonList(props: { results: DefensePokemonThreat[] }) {
  const [showAll, setShowAll] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const visibleResults = showAll
    ? props.results
    : props.results.slice(0, TOP_RESULT_COUNT);

  return (
    <section className="pokemonListCard defenseListCard">
      <div className="pokemonListHeader">
        <div>
          <h3>要注意の相手</h3>
          <p>こちらの複数体に抜群を取りやすいポケモンです。</p>
        </div>
      </div>

      <div className="pokemonRiskList">
        {visibleResults.map((result, index) => {
          const isExpanded = expandedId === result.pokemon.id;
          const label = getDefenseRiskLabel(result);
          const weakTargets = result.details.filter(
            (detail) => detail.category === "抜群"
          );

          return (
            <article className="pokemonRiskRow" key={result.pokemon.id}>
              <button
                type="button"
                className="pokemonRiskMain"
                onClick={() =>
                  setExpandedId(isExpanded ? null : result.pokemon.id)
                }
              >
                <span className="rankBadge">#{index + 1}</span>

                {result.pokemon.imageUrl ? (
                  <img
                    className="riskPokemonImage"
                    src={result.pokemon.imageUrl}
                    alt={result.pokemon.name}
                  />
                ) : (
                  <span className="riskPokemonPlaceholder">
                    {result.pokemon.name.slice(0, 1)}
                  </span>
                )}

                <span className="riskPokemonInfo">
                  <strong>{getDefenseThreatPokemonName(result.pokemon)}</strong>
                  <span className="typeRow">
                    {result.pokemon.types.map((type) => (
                      <TypeBadge key={type} type={type} />
                    ))}
                  </span>
                </span>

                <span className={`riskLabel ${label.className}`}>
                  ● {label.text}
                </span>

                <span className="riskReason">
                  刺さる：
                  {weakTargets.length > 0
                    ? weakTargets.map((detail) => detail.pokemonName).join("、")
                    : "大きな弱点なし"}
                </span>

                <span className="expandIcon">{isExpanded ? "▲" : "▼"}</span>
              </button>

              {isExpanded && (
                <DetailList
                  details={result.details}
                  title="この相手の攻撃タイプが通る先"
                />
              )}
            </article>
          );
        })}
      </div>

      {props.results.length > TOP_RESULT_COUNT && (
        <button
          type="button"
          className="showAllButton"
          onClick={() => setShowAll((current) => !current)}
        >
          {showAll ? "上位10件に戻す" : "全件表示"}
        </button>
      )}
    </section>
  );
}

function OffenseProblemPokemonList(props: { results: OffensePokemonProblem[] }) {
  const [showAll, setShowAll] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const visibleResults = showAll
    ? props.results
    : props.results.slice(0, TOP_RESULT_COUNT);

  return (
    <section className="pokemonListCard offenseListCard">
      <div className="pokemonListHeader">
        <div>
          <h3>攻めづらい相手</h3>
          <p>こちらの選択技で抜群を取りづらいポケモンです。</p>
        </div>
      </div>

      <div className="pokemonRiskList">
        {visibleResults.map((result, index) => {
          const isExpanded = expandedId === result.pokemon.id;
          const label = getOffenseRiskLabel(result);

          return (
            <article className="pokemonRiskRow" key={result.pokemon.id}>
              <button
                type="button"
                className="pokemonRiskMain"
                onClick={() =>
                  setExpandedId(isExpanded ? null : result.pokemon.id)
                }
              >
                <span className="rankBadge">#{index + 1}</span>

                {result.pokemon.imageUrl ? (
                  <img
                    className="riskPokemonImage"
                    src={result.pokemon.imageUrl}
                    alt={result.pokemon.name}
                  />
                ) : (
                  <span className="riskPokemonPlaceholder">
                    {result.pokemon.name.slice(0, 1)}
                  </span>
                )}

                <span className="riskPokemonInfo">
                  <strong>{result.pokemon.name}</strong>
                  <span className="typeRow">
                    {result.pokemon.types.map((type) => (
                      <TypeBadge key={type} type={type} />
                    ))}
                  </span>
                </span>

                <span className={`riskLabel ${label.className}`}>
                  ● {label.text}
                </span>

                <span className="riskReason">
                  抜群を取れる：{result.superEffectiveCount}体
                </span>

                <span className="expandIcon">{isExpanded ? "▲" : "▼"}</span>
              </button>

              {isExpanded && (
                <DetailList
                  details={result.details}
                  title="この相手への最良打点"
                />
              )}
            </article>
          );
        })}
      </div>

      {props.results.length > TOP_RESULT_COUNT && (
        <button
          type="button"
          className="showAllButton"
          onClick={() => setShowAll((current) => !current)}
        >
          {showAll ? "上位10件に戻す" : "全件表示"}
        </button>
      )}
    </section>
  );
}

function DetailList(props: {
  details: AnalysisDetailWithMove[];
  title?: string;
}) {
  return (
    <div className="detailList pokemonDetailList">
      {props.title && <strong className="detailListTitle">{props.title}</strong>}

      {props.details.map((detail) => (
        <div className="detailItem" key={detail.pokemonId}>
          <strong>{detail.pokemonName}</strong>
          <span>
            {detail.moveName
              ? `使用技：${detail.moveName}（${detail.usedType}）`
              : `使用タイプ：${detail.usedType}`}
            {detail.isFallback ? " ※仮判定" : ""}
          </span>
          <span>倍率：{detail.multiplier}倍</span>
          <span>判定：{detail.category}</span>
        </div>
      ))}
    </div>
  );
}

function TypeBadge(props: { type: PokemonType }) {
  const style = TYPE_STYLES[props.type];

  return (
    <span
      className="typeBadge readableTypeBadge"
      style={{
        backgroundColor: style.background,
        color: style.text,
      }}
    >
      {props.type}
    </span>
  );
}

function normalizeSearchText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[ァ-ン]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - 0x60)
    );
}

function getSearchCandidates(
  query: string,
  selectedTypeFilters: PokemonType[]
): PokemonData[] {
  const normalizedQuery = normalizeSearchText(query);

  return pokemonData
    .filter((pokemon) => {
      const searchTargets = [
        pokemon.name,
        ...pokemon.searchKeywords,
        normalizeSearchText(pokemon.name),
        ...pokemon.searchKeywords.map((keyword) =>
          normalizeSearchText(keyword)
        ),
      ];

      const matchesQuery =
        normalizedQuery === "" ||
        searchTargets.some((target) =>
          normalizeSearchText(target).includes(normalizedQuery)
        );

      const matchesType =
        selectedTypeFilters.length === 0 ||
        selectedTypeFilters.some((type) => pokemon.types.includes(type));

      return matchesQuery && matchesType;
    })
    .slice(0, 80);
}

function getMoveCandidates(
  query: string,
  pokemon?: PokemonData
): MoveData[] {
  const normalizedQuery = normalizeSearchText(query);

  return moveData
    .filter((move) => {
      if (normalizedQuery === "") {
        return true;
      }

      return normalizeSearchText(move.name).includes(normalizedQuery);
    })
    .sort((a, b) => {
      if (!pokemon) {
        return 0;
      }

      const scoreA = getMoveCandidateScore(a, pokemon);
      const scoreB = getMoveCandidateScore(b, pokemon);

      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }

      return moveData.indexOf(a) - moveData.indexOf(b);
    })
    .slice(0, 12);
}

function getMoveCandidateScore(move: MoveData, pokemon: PokemonData) {
  let score = 0;

  const isSameType = pokemon.types.includes(move.type);

  if (isSameType) {
    score += 100;
  }

  if (pokemon.attackStyle === "物理" && move.category === "物理") {
    score += 40;
  }

  if (pokemon.attackStyle === "特殊" && move.category === "特殊") {
    score += 40;
  }

  if (
    pokemon.attackStyle === "両刀" &&
    (move.category === "物理" || move.category === "特殊")
  ) {
    score += 25;
  }

  if (pokemon.attackStyle === "補助") {
    if (isSameType) {
      score += 10;
    }

    if (move.category === "その他") {
      score -= 20;
    }
  }

  if (pokemon.attackStyle === "不明" || pokemon.attackStyle === undefined) {
    if (isSameType) {
      score += 10;
    }
  }

  if (move.category === "その他") {
    score -= 10;
  }

  return score;
}

function getMoveDefenseMultiplier(params: {
  move: MoveData;
  defender: PokemonData;
  defenderAbilityEnabled: boolean;
  moldBreakerEnabled: boolean;
}) {
  const { move, defender, defenderAbilityEnabled, moldBreakerEnabled } = params;

  let multiplier = getTypeMultiplier(move.type, defender.types);

  if (defenderAbilityEnabled && defender.defensiveAbilityEffect) {
    multiplier = applyDefensiveAbilityEffect({
      multiplier,
      move,
      effect: defender.defensiveAbilityEffect,
      moldBreakerEnabled,
    });
  }

  return multiplier;
}

function applyDefensiveAbilityEffect(params: {
  multiplier: number;
  move: MoveData;
  effect: NonNullable<PokemonData["defensiveAbilityEffect"]>;
  moldBreakerEnabled: boolean;
}) {
  const { multiplier, move, effect, moldBreakerEnabled } = params;

  if (moldBreakerEnabled && effect.ignoredByMoldBreaker) {
    return multiplier;
  }

  switch (effect.kind) {
    case "huyuu":
      if (move.type === "じめん") {
        return 0;
      }
      return multiplier;

    case "unaginobori":
      if (move.type === "でんき") {
        return 0;
      }
      return multiplier;

    case "atuisibou":
      if (move.type === "ほのお" || move.type === "こおり") {
        return multiplier * 0.5;
      }
      return multiplier;

    case "tyosui":
      if (move.type === "みず") {
        return 0;
      }
      return multiplier;

    case "hiraisinn":
      if (move.type === "でんき") {
        return 0;
      }
      return multiplier;

    case "tikudenn":
      if (move.type === "でんき") {
        return 0;
      }
      return multiplier;

    case "tainetu":
      if (move.type === "ほのお") {
        return multiplier * 0.5;
      }
      return multiplier;

    case "soushoku":
      if (move.type === "くさ") {
        return 0;
      }
      return multiplier;

    case "moraibi":
      if (move.type === "ほのお") {
        return 0;
      }
      return multiplier;

    case "hideri":
      if (move.type === "みず") {
        return multiplier * 0.5;
      }

      if (move.type === "ほのお") {
        return multiplier * 1.5;
      }

      return multiplier;

    case "amehurasi":
      if (move.type === "ほのお") {
        return multiplier * 0.5;
      }

      if (move.type === "みず") {
        return multiplier * 1.5;
      }

      return multiplier;

    case "feari-o-ra":
      if (move.type === "フェアリー") {
        return multiplier * (4 / 3);
      }

      return multiplier;

    default:
      return multiplier;
  }
}

function analyzeOffenseSingleTypesFromSlots(
  slots: PartySlot[]
): OffenseAnalysisResult[] {
  const activeSlots = slots.filter(
    (slot): slot is PartySlot & { pokemon: PokemonData } =>
      slot.pokemon !== null
  );

  const results = POKEMON_TYPES.map((defenseType) => {
    const dummyDefender: PokemonData = {
      id: `single-${defenseType}`,
      name: defenseType,
      types: [defenseType],
      searchKeywords: [],
      attackStyle: "不明",
    };

    const details = activeSlots.map((slot) =>
      getBestOffenseDetailForSlot(slot, dummyDefender)
    );

    return {
      targetTypes: [defenseType],
      details,
      ...countOffenseDetails(details),
    };
  });

  return results.sort((a, b) => {
    return (
      a.superEffectiveCount - b.superEffectiveCount ||
      a.neutralOrBetterCount - b.neutralOrBetterCount ||
      b.notVeryEffectiveCount +
      b.noEffectCount -
      (a.notVeryEffectiveCount + a.noEffectCount)
    );
  });
}

function analyzeDefenseThreatPokemon(
  slots: PartySlot[],
  opponents: PokemonData[]
): DefensePokemonThreat[] {
  const activeSlots = slots.filter(
    (slot): slot is PartySlot & { pokemon: PokemonData } =>
      slot.pokemon !== null
  );

  const results = opponents.map((opponent) => {
    const attackOptions = getFallbackAttackOptions(opponent);

    const details = activeSlots.map((targetSlot) => {
      const candidates = attackOptions.map((attackOption) => {
        const multiplier = getMoveDefenseMultiplier({
          move: attackOption.move,
          defender: targetSlot.pokemon,
          defenderAbilityEnabled: targetSlot.defensiveAbilityEnabled,
          moldBreakerEnabled: opponent.canUseMoldBreaker === true,
        });

        return {
          pokemonId: targetSlot.pokemon.id,
          pokemonName: targetSlot.pokemon.name,
          usedType: attackOption.type,
          moveName: attackOption.moveName,
          isFallback: attackOption.isFallback,
          multiplier,
          category: classifyMultiplier(multiplier) as MatchupCategory,
        };
      });

      return candidates.reduce((best, current) =>
        current.multiplier > best.multiplier ? current : best
      );
    });

    return {
      pokemon: opponent,
      details,
      ...countDefenseDetails(details),
    };
  });

  return results.sort((a, b) => {
    return (
      b.superEffectiveCount - a.superEffectiveCount ||
      a.notVeryEffectiveCount +
      a.noEffectCount -
      (b.notVeryEffectiveCount + b.noEffectCount) ||
      b.neutralCount - a.neutralCount
    );
  });
}

function analyzeOffenseProblemPokemon(
  slots: PartySlot[],
  opponents: PokemonData[]
): OffensePokemonProblem[] {
  const activeSlots = slots.filter(
    (slot): slot is PartySlot & { pokemon: PokemonData } =>
      slot.pokemon !== null
  );

  const results = opponents.map((opponent) => {
    const details = activeSlots.map((slot) =>
      getBestOffenseDetailForSlot(slot, opponent)
    );

    return {
      pokemon: opponent,
      details,
      ...countOffenseDetails(details),
    };
  });

  return results.sort((a, b) => {
    return (
      a.superEffectiveCount - b.superEffectiveCount ||
      a.neutralOrBetterCount - b.neutralOrBetterCount ||
      b.notVeryEffectiveCount +
      b.noEffectCount -
      (a.notVeryEffectiveCount + a.noEffectCount)
    );
  });
}

function getBestOffenseDetailForSlot(
  slot: PartySlot & { pokemon: PokemonData },
  defender: PokemonData
): AnalysisDetailWithMove {
  const attackOptions = getSlotAttackOptions(slot);

  if (attackOptions.length === 0) {
    return {
      pokemonId: slot.pokemon.id,
      pokemonName: slot.pokemon.name,
      usedType: slot.pokemon.types[0],
      moveName: "技未選択",
      isFallback: false,
      multiplier: 0,
      category: "無効",
    };
  }

  const candidates = attackOptions.map((attackOption) => {
    const multiplier = getMoveDefenseMultiplier({
      move: attackOption.move,
      defender,
      defenderAbilityEnabled: true,
      moldBreakerEnabled: slot.moldBreakerEnabled,
    });

    return {
      pokemonId: slot.pokemon.id,
      pokemonName: slot.pokemon.name,
      usedType: attackOption.type,
      moveName: attackOption.moveName,
      isFallback: attackOption.isFallback,
      multiplier,
      category: classifyMultiplier(multiplier) as MatchupCategory,
    };
  });

  return candidates.reduce((best, current) =>
    current.multiplier > best.multiplier ? current : best
  );
}

function getSlotAttackOptions(slot: PartySlot & { pokemon: PokemonData }) {
  return slot.moves.map((move) => ({
    move,
    type: move.type,
    moveName: move.name,
    isFallback: false,
  }));
}
function getDefenseThreatPokemonName(pokemon: PokemonData) {
  if (pokemon.canUseMoldBreaker) {
    return `${pokemon.name}（かたやぶり）`;
  }

  return pokemon.name;
}

function getFallbackAttackOptions(pokemon: PokemonData) {
  return pokemon.types.map((type) => ({
    move: {
      id: `fallback-${pokemon.id}-${type}`,
      name: `${type}技`,
      type,
      category: "物理" as const,
    },
    type,
    moveName: `${type}技`,
    isFallback: true,
  }));
}

function countDefenseDetails(details: AnalysisDetailWithMove[]) {
  return {
    superEffectiveCount: details.filter((detail) => detail.category === "抜群")
      .length,
    neutralCount: details.filter((detail) => detail.category === "等倍").length,
    notVeryEffectiveCount: details.filter(
      (detail) => detail.category === "半減以下"
    ).length,
    noEffectCount: details.filter((detail) => detail.category === "無効")
      .length,
  };
}

function countOffenseDetails(details: AnalysisDetailWithMove[]) {
  return {
    superEffectiveCount: details.filter((detail) => detail.category === "抜群")
      .length,
    neutralOrBetterCount: details.filter(
      (detail) => detail.category === "等倍" || detail.category === "抜群"
    ).length,
    notVeryEffectiveCount: details.filter(
      (detail) => detail.category === "半減以下"
    ).length,
    noEffectCount: details.filter((detail) => detail.category === "無効")
      .length,
  };
}

function getDefenseRiskLabel(result: DefensePokemonThreat) {
  if (result.superEffectiveCount >= 2) {
    return {
      text: "危険",
      className: "dangerRisk",
    };
  }

  if (result.superEffectiveCount === 1) {
    return {
      text: "不安",
      className: "warningRisk",
    };
  }

  return {
    text: "軽め",
    className: "safeRisk",
  };
}

function getOffenseRiskLabel(result: OffensePokemonProblem) {
  if (result.superEffectiveCount === 0) {
    return {
      text: "厳しい",
      className: "dangerRisk",
    };
  }

  if (result.superEffectiveCount === 1) {
    return {
      text: "やや重い",
      className: "warningRisk",
    };
  }

  return {
    text: "通しやすい",
    className: "safeRisk",
  };
}

export default App;