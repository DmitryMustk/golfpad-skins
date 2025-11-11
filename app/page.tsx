'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';

const playerSchema = z.object({
  id: z.string().min(1, 'Player ID is required'),
  scores: z
    .string()
    .min(1, 'Enter scores separated by comma')
    .refine(
      (val) => val.split(',').every((n) => !isNaN(Number(n.trim()))),
      'All scores must be numbers'
    ),
});

const formSchema = z.object({
  holesCount: z
    .number({ invalid_type_error: 'Holes count must be a number' })
    .int()
    .min(1)
    .max(18),
  players: z.array(playerSchema).min(2, 'At least 2 players').max(6),
});

type FormValues = z.infer<typeof formSchema>;

type SkinsResponse = {
  playerSkins: Record<string, number>;
  winner: string;
  holes: Array<{
    holeNumber: number;
    bankBefore: number;
    scores: Record<string, number>;
    winners: string[];
  }>;
  unclaimedBank: number;
};

export default function Page() {
  const [result, setResult] = useState<SkinsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      holesCount: 18,
      players: [
        { id: 'p1', scores: '' },
        { id: 'p2', scores: '' },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'players',
  });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const playersPayload = values.players.map((p) => ({
        id: p.id,
        scores: p.scores
          .split(',')
          .map((n) => Number(n.trim()))
          .filter((n) => !isNaN(n)),
      }));

      const resp = await fetch(`${apiBase}/api/skins/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          holesCount: values.holesCount,
          players: playersPayload,
        }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => null);
        throw new Error(data?.message || `Request failed with ${resp.status}`);
      }

      const data: SkinsResponse = await resp.json();
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const holesCount = watch('holesCount');

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-10">
      <div className="max-w-6xl mx-auto px-4 space-y-6">
        {/* header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Skins calculator</h1>
            <p className="text-slate-600 mt-1">
              Enter players and their scores per hole to calculate who won.
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            v0.1 demo
          </span>
        </div>

        <div className="grid lg:grid-cols-[1.1fr,0.9fr] gap-6 items-start">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-6"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Setup</p>
                <h2 className="text-lg font-semibold text-slate-900">Game parameters</h2>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Holes count
                </label>
                <input
                  type="number"
                  min={1}
                  max={18}
                  {...register('holesCount', { valueAsNumber: true })}
                  className="w-28 rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-sm"
                />
                {errors.holesCount && (
                  <p className="text-[10px] text-red-500 mt-1">{errors.holesCount.message}</p>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Standard course: 18 holes
              </p>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Players</p>
                <h2 className="text-sm font-semibold text-slate-900">
                  Add players and their hole scores
                </h2>
              </div>
              <button
                type="button"
                onClick={() => append({ id: `p${fields.length + 1}`, scores: '' })}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-900 text-white px-3 py-1.5 text-xs font-medium hover:bg-slate-700"
              >
                + Add player
              </button>
            </div>

            <div className="grid gap-3">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-xs font-medium text-slate-600">Player ID</label>
                      <input
                        {...register(`players.${index}.id` as const)}
                        className="mt-1 w-full rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-sm"
                      />
                      {errors.players?.[index]?.id && (
                        <p className="text-[10px] text-red-500 mt-1">
                          {errors.players[index]?.id?.message}
                        </p>
                      )}
                    </div>
                    {fields.length > 2 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-xs text-red-500 hover:text-red-600"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-600">
                      Scores (comma separated)
                    </label>
                    <input
                      {...register(`players.${index}.scores` as const)}
                      placeholder="4,5,4,5,..."
                      className="mt-1 w-full rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-sm"
                    />
                    <div className="flex items-center gap-2 mt-1">
                      {holesCount ? (
                        <p className="text-[10px] text-slate-400">
                          Expecting {holesCount} scores.
                        </p>
                      ) : null}
                      {errors.players?.[index]?.scores && (
                        <p className="text-[10px] text-red-500">
                          {errors.players[index]?.scores?.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-emerald-500 disabled:opacity-50"
              >
                {loading ? 'Calculating…' : 'Calculate'}
              </button>
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
          </form>

          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 min-h-[180px]">
              <h2 className="text-lg font-semibold text-slate-900 mb-3">Result</h2>
              {!result ? (
                <p className="text-sm text-slate-500">
                  Fill the form and click <span className="font-medium">Calculate</span> to see
                  scores.
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-1 rounded-xl bg-emerald-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-emerald-700">Winner</p>
                      <p className="text-xl font-semibold text-emerald-900">
                        {result.winner === 'TIE' ? 'Tie' : result.winner}
                      </p>
                    </div>
                    <div className="flex-1 rounded-xl bg-slate-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Unclaimed bank
                      </p>
                      <p className="text-xl font-semibold text-slate-900">{result.unclaimedBank}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">
                      Player skins
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {Object.entries(result.playerSkins).map(([id, skins]) => (
                        <div
                          key={id}
                          className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 min-w-[90px]"
                        >
                          <p className="text-[10px] uppercase tracking-wide text-slate-500">
                            {id}
                          </p>
                          <p className="text-lg font-semibold text-slate-900">{skins}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {result && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-900">Holes breakdown</h3>
                  <p className="text-xs text-slate-400">
                    {result.holes.length} holes
                  </p>
                </div>
                <div className="overflow-x-auto rounded-lg border border-slate-100">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-2 py-2 text-left text-xs font-medium text-slate-500">
                          #
                        </th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-slate-500">
                          Bank
                        </th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-slate-500">
                          Scores
                        </th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-slate-500">
                          Winners
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.holes.map((hole, idx) => (
                        <tr key={hole.holeNumber} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                          <td className="px-2 py-2 text-slate-700">{hole.holeNumber}</td>
                          <td className="px-2 py-2 text-slate-700">{hole.bankBefore}</td>
                          <td className="px-2 py-2">
                            {Object.entries(hole.scores).map(([pid, score]) => (
                              <span key={pid} className="inline-flex items-center gap-1 mr-3 text-xs text-slate-600">
                                <span className="rounded bg-slate-100 px-1 py-[2px] text-[10px] font-medium text-slate-700">
                                  {pid}
                                </span>
                                {score}
                              </span>
                            ))}
                          </td>
                          <td className="px-2 py-2 text-slate-700">
                            {hole.winners.length === 0 ? (
                              <span className="text-xs text-slate-400">—</span>
                            ) : (
                              hole.winners.map((w) => (
                                <span
                                  key={w}
                                  className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-[2px] text-[10px] font-medium text-emerald-700 mr-2"
                                >
                                  {w}
                                </span>
                              ))
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
