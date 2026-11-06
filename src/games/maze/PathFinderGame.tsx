/**
 * 'path-finder' — direction puzzles on a small jungle grid.
 *  mode 'choose':  pick the arrow list that takes the explorer to the treasure (ChoiceGrid).
 *  mode 'program': tap arrows to build a program, press Go and watch the explorer walk it.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import type { PuzzleProps } from '@/types';
import { ChestArt, RetryIcon } from '@/art/ui';
import { AudioService } from '@/services/AudioService';
import { GameButton, GameText, IconButton } from '@/components/ui';
import { ChoiceGrid, PopIn, Tile, useHintEffect, usePuzzle, useRounds, useTimers, type Choice } from '@/games/shared';
import { generatePathPuzzle, runProgram, stepCell, toRuns, type Dir, type PathParams, type PathPuzzle } from './generators';
import { BoardFrame, FootprintLayer, GridToken, TileBoard, FRAME } from './kit/boards';
import { ArrowIcon, ExplorerToken, bushTile, grassTile, rockTile, waterTile } from './kit/art';

const WALK_MS = 380;

/** Compact arrow list: arrow + "x3" for repeated moves. */
function ArrowRuns({ dirs, size }: { dirs: Dir[]; size: number }) {
  const runs = toRuns(dirs);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', gap: 2 }}>
      {runs.map((r, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ArrowIcon dir={r.dir} size={size} color="#FFD23F" />
          {r.count > 1 && (
            <GameText size={size * 0.62} weight="black" color="#5A3A16">
              {`x${r.count}`}
            </GameText>
          )}
        </View>
      ))}
    </View>
  );
}

function PathBoard({ puz, cell, walker, hint, bump }: { puz: PathPuzzle; cell: number; walker: number; hint: { cell: number; dir: Dir }[]; bump: { n: number; dir: Dir } }) {
  const n = puz.size;
  const version = `${puz.start}-${puz.treasure}-${puz.obstacles.map((o) => (o ? o[0] : '.')).join('')}`;
  const paint = useCallback(
    (i: number, x: number, y: number, s: number, v: number) => {
      const o = puz.obstacles[i];
      return (
        <React.Fragment key={i}>
          {grassTile(`g${i}`, x, y, s, v)}
          {o === 'rock' && rockTile(`o${i}`, x, y, s)}
          {o === 'bush' && bushTile(`o${i}`, x, y, s)}
          {o === 'water' && waterTile(`o${i}`, x, y, s)}
        </React.Fragment>
      );
    },
    [puz],
  );
  return (
    <BoardFrame width={cell * n} height={cell * n}>
      <TileBoard cols={n} rows={n} cell={cell} paint={paint} version={version} />
      <GridToken index={puz.treasure} cols={n} cell={cell} size={cell * 0.84}>
        <View style={{ paddingTop: cell * 0.08 }}>
          <ChestArt size={cell * 0.84} open={walker === puz.treasure} />
        </View>
      </GridToken>
      <FootprintLayer steps={hint} cols={n} rows={n} cell={cell} />
      <GridToken index={walker} cols={n} cell={cell} size={cell * 0.8} duration={WALK_MS * 0.8} bump={bump.n} bumpDir={bump.dir} zIndex={5}>
        <ExplorerToken size={cell * 0.8} />
      </GridToken>
    </BoardFrame>
  );
}

export default function PathFinderGame(props: PuzzleProps<PathParams>) {
  const { params, seed, onSolved, onMistake, onCorrect, onProgress, hintSignal, paused, width, height } = props;
  const mode = params.mode ?? 'choose';
  const rounds = useRounds(Math.max(1, params.rounds ?? 1), { onSolved: () => onSolved(), onProgress, delayMs: 700 });
  const puz = usePuzzle(seed, () => generatePathPuzzle(seed, params, rounds.round), [rounds.round, params.size, params.steps, params.obstacles]);
  const n = puz.size;
  const { later } = useTimers();

  const [walker, setWalker] = useState(puz.start);
  const [bump, setBump] = useState<{ n: number; dir: Dir }>({ n: 0, dir: 'U' });
  const [hintSteps, setHintSteps] = useState(0);
  const [program, setProgram] = useState<Dir[]>([]);
  /** walking animation: cells to visit and what happens at the end */
  const [walk, setWalk] = useState<{ cells: number[]; k: number; end: 'win' | 'crash' | 'short'; crashDir?: Dir } | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    setWalker(puz.start);
    setProgram([]);
    setWalk(null);
    setHintSteps(0);
    doneRef.current = false;
  }, [puz]);

  const finishRound = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    AudioService.play('correct');
    onCorrect?.();
    rounds.next();
  }, [onCorrect, rounds]);

  /* step-by-step walk, pause aware */
  useEffect(() => {
    if (!walk || paused) return;
    if (walk.k < walk.cells.length) {
      return later(() => {
        setWalker(walk.cells[walk.k]);
        AudioService.play('pop');
        setWalk({ ...walk, k: walk.k + 1 });
      }, WALK_MS);
    }
    return later(() => {
      setWalk(null);
      if (walk.end === 'win') finishRound();
      else {
        if (walk.end === 'crash' && walk.crashDir) setBump((b) => ({ n: b.n + 1, dir: walk.crashDir! }));
        AudioService.play('wrong');
        onMistake();
        later(() => setWalker(puz.start), 650);
      }
    }, 260);
  }, [walk, paused, later, finishRound, onMistake, puz.start]);

  useHintEffect(hintSignal, () => {
    setHintSteps((h) => Math.min(puz.solution.length, h + 3));
  });

  const hint = useMemo(() => {
    const out: { cell: number; dir: Dir }[] = [];
    let cur = puz.start;
    for (let i = 0; i < hintSteps; i++) {
      cur = stepCell(cur, puz.solution[i], n, n);
      out.push({ cell: cur, dir: puz.solution[i] });
    }
    return out;
  }, [hintSteps, puz, n]);

  /* layout */
  const controlsH = mode === 'choose' ? Math.min(250, height * 0.42) : Math.min(230, height * 0.44);
  const cell = Math.floor(Math.min((width - FRAME * 2 - 8) / n, (height - controlsH - 24) / n, 84));

  const startWalk = (dirs: Dir[]) => {
    const res = runProgram(puz, dirs);
    const cells = res.cells.slice(1);
    const end = res.reachedAt >= 0 ? 'win' : res.crashAt >= 0 ? 'crash' : 'short';
    setWalker(puz.start);
    setWalk({ cells, k: 0, end, crashDir: res.crashAt >= 0 ? dirs[res.crashAt] : undefined });
  };

  /* ---------------------------------------------------------- choose */
  if (mode === 'choose') {
    const maxRuns = Math.max(...puz.choices.map((c) => toRuns(c.dirs).length));
    const columns = maxRuns > 3 ? 1 : 2;
    const colW = columns === 1 ? width : (width - 12) / 2;
    const itemH = columns === 1 ? Math.min(52, (controlsH - 36) / 4) : Math.min(76, (controlsH - 12) / 2);
    const arrowSize = Math.max(18, Math.min(itemH * 0.55, (colW * 0.85) / (maxRuns * 1.6)));
    const choices: Choice[] = puz.choices.map((c) => ({ key: c.key, render: () => <ArrowRuns dirs={c.dirs} size={arrowSize} /> }));
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'space-evenly' }}>
        <PopIn k={`b${rounds.round}`}>
          <PathBoard puz={puz} cell={cell} walker={walker} hint={hint} bump={bump} />
        </PopIn>
        {rounds.total > 1 && (
          <GameText size={15} color="#fff" weight="black" outline>{`Trail ${rounds.round + 1} of ${rounds.total}`}</GameText>
        )}
        <ChoiceGrid
          choices={choices}
          correctKey={puz.correctKey}
          roundKey={rounds.round}
          columns={columns}
          width={width}
          itemHeight={itemH}
          hintKey={hintSteps > 0 ? puz.correctKey : null}
          disabled={paused || !!walk}
          onCorrect={() => {
            AudioService.play('click');
            startWalk(puz.solution);
          }}
          onWrong={() => {
            AudioService.play('wrong');
            onMistake();
          }}
        />
      </View>
    );
  }

  /* --------------------------------------------------------- program */
  const maxLen = Math.min(14, puz.solution.length + 4);
  const chip = Math.max(26, Math.min(40, Math.floor((width - 10) / 8) - 6));
  const btn = Math.max(50, Math.min(62, Math.floor(width / 6)));
  const locked = paused || !!walk || doneRef.current;
  const add = (d: Dir) => {
    if (locked) return;
    if (program.length >= maxLen) {
      AudioService.play('wrong');
      return;
    }
    AudioService.play('pop');
    setWalker(puz.start);
    setProgram((p) => [...p, d]);
  };
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'space-evenly' }}>
      <PathBoard puz={puz} cell={cell} walker={walker} hint={hint} bump={bump} />
      <View
        style={{
          width,
          minHeight: chip * 2 + 22,
          borderRadius: 16,
          backgroundColor: 'rgba(255,244,220,0.92)',
          borderWidth: 3,
          borderColor: '#E8C994',
          padding: 6,
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 6,
          alignContent: 'flex-start',
        }}
      >
        {program.length === 0 ? (
          <GameText size={15} color="#6B5843" style={{ padding: 6 }}>
            Tap the arrows below to plan the path
          </GameText>
        ) : (
          program.map((d, i) => {
            const k = walk ? walk.k - 1 : -1;
            return (
              <Tile
                key={i}
                size={chip}
                state={i === k ? 'selected' : 'idle'}
                onPress={locked ? undefined : () => setProgram((p) => p.filter((_, j) => j !== i))}
              >
                <ArrowIcon dir={d} size={chip * 0.7} color="#FFD23F" />
              </Tile>
            );
          })
        )}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {(['L', 'U', 'D', 'R'] as Dir[]).map((d) => (
          <IconButton key={d} size={btn} variant="green" onPress={() => add(d)} disabled={locked} sound={null}>
            <ArrowIcon dir={d} size={btn * 0.56} stroke="#24800E" />
          </IconButton>
        ))}
        <IconButton size={btn * 0.82} variant="red" disabled={locked || !program.length} onPress={() => setProgram([])}>
          <RetryIcon size={btn * 0.4} color="#fff" />
        </IconButton>
      </View>
      <GameButton
        label="Go!"
        variant="orange"
        size="md"
        disabled={locked || !program.length}
        style={{ width: Math.min(220, width * 0.6) }}
        onPress={() => startWalk(program)}
      />
    </View>
  );
}
