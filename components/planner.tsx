'use client';
import { useId, useState } from 'react';
import { useWorkspace } from './workspace-context';
import { PageHeading, Notice, downloadText, Empty } from './ui';
import {
  buildSchedule,
  formatDate,
  money,
  monthlyObligation,
  toCents,
  today,
} from '@/lib/algorithms';
import type { Installment, Interval, PlanInput } from '@/lib/types';
import { ArrowRight, Download, Calculator, Check, ShieldCheck, TrendingDown } from 'lucide-react';
export function BalanceChart({ rows, total }: { rows: Installment[]; total: number }) {
  const id = useId().replaceAll(':', '');
  const w = 650,
    h = 210,
    pad = 45;
  const points = [{ balance_cents: total, date: rows[0]?.date ?? today() }, ...rows];
  const xy = points.map((p, i) => [
    pad + (i * (w - pad - 15)) / Math.max(1, points.length - 1),
    20 + (1 - p.balance_cents / Math.max(total, 1)) * (h - 60),
  ]);
  const path = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ');
  return (
    <svg
      className="balance-chart"
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={`Illustrative remaining balance decreases from ${money(total)} to ${money(rows.at(-1)?.balance_cents ?? total)} across ${rows.length} payments. Exact figures are in the schedule table.`}
    >
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#147d77" stopOpacity=".16" />
          <stop offset="100%" stopColor="#147d77" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line
            x1={pad}
            x2={w - 15}
            y1={20 + f * (h - 60)}
            y2={20 + f * (h - 60)}
            stroke="#e5e9e7"
            strokeDasharray="4 4"
          />
          <text x="0" y={24 + f * (h - 60)} fontSize="11" fill="#67776f">
            ${Math.round((total * (1 - f)) / 100).toLocaleString()}
          </text>
        </g>
      ))}
      <path d={`${path} L${w - 15},${h - 40} L${pad},${h - 40} Z`} fill={`url(#${id})`} />
      <path d={path} fill="none" stroke="#147d77" strokeWidth="2.5" />
      {xy.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.5" fill="#fff" stroke="#147d77" strokeWidth="2" />
      ))}
      <text x={pad} y={h - 12} fontSize="11" fill="#67776f">
        Starting balance
      </text>
      <text x={w - 110} y={h - 12} fontSize="11" fill="#67776f">
        Final payment
      </text>
    </svg>
  );
}
export function PlannerPage() {
  const { state, run, busy } = useWorkspace();
  const a = state.assessment;
  const uid = state.profile.id;
  const [total, setTotal] = useState(String((a?.arrears_cents ?? 120000) / 100)),
    [initial, setInitial] = useState('200'),
    [count, setCount] = useState(5),
    [interval, setInterval] = useState<Interval>('monthly'),
    [start, setStart] = useState(today()),
    [income, setIncome] = useState(String((a?.income_cents ?? 280000) / 100)),
    [expenses, setExpenses] = useState(String((a?.expenses_cents ?? 75000) / 100)),
    [rent, setRent] = useState(String((a?.rent_cents ?? 150000) / 100)),
    [caseId, setCaseId] = useState(''),
    [consent, setConsent] = useState(false);
  let rows: Installment[] = [],
    error = '',
    terms: PlanInput | undefined,
    available = 0,
    peak = 0;
  try {
    terms = {
      total_cents: toCents(total || '0'),
      initial_cents: toCents(initial || '0'),
      count,
      interval,
      start_date: start,
    };
    rows = buildSchedule(terms);
    available = toCents(income || '0') - toCents(expenses || '0') - toCents(rent || '0');
    peak = monthlyObligation(rows);
  } catch (e) {
    error = e instanceof Error ? e.message : 'Check the plan inputs.';
  }
  const cases = state.cases.filter(
    (c) =>
      state.participants.some(
        (p) => p.case_id === c.id && p.user_id === uid && !p.blocked && p.accepted_at,
      ) && !['Closed', 'Resolved'].includes(c.status),
  );
  const csv = () =>
    downloadText(
      'repayment-scenario.csv',
      'Payment,Date,Amount USD,Remaining USD\n' +
        rows
          .map(
            (r) =>
              `${r.label},${r.date},${(r.amount_cents / 100).toFixed(2)},${(r.balance_cents / 100).toFixed(2)}`,
          )
          .join('\n'),
      'text/csv',
    );
  return (
    <>
      <PageHeading
        eyebrow="A LITTLE CLARITY IN THE NUMBERS"
        title="Explore a repayment path."
        description="Compare possibilities using your own estimates. Nothing is sent unless you choose to share."
        action={
          <button className="btn secondary" onClick={csv} disabled={Boolean(error) || !rows.length}>
            <Download size={16} />
            Export schedule
          </button>
        }
      />
      <div className="planner-layout">
        <section className="panel planner-inputs">
          <div className="panel-header">
            <span className="icon-tile">
              <Calculator size={20} />
            </span>
            <h2>Your scenario</h2>
          </div>
          <div className="form-stack">
            <label>
              Unpaid rent being discussed
              <span className="currency-input">
                <span>$</span>
                <input
                  aria-label="Unpaid rent being discussed"
                  type="number"
                  min={0}
                  step="0.01"
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                />
              </span>
            </label>
            <label>
              Proposed initial payment
              <span className="currency-input">
                <span>$</span>
                <input
                  aria-label="Proposed initial payment"
                  type="number"
                  min={0}
                  step="0.01"
                  value={initial}
                  onChange={(e) => setInitial(e.target.value)}
                />
              </span>
            </label>
            <label>
              <span className="label-row">
                Remaining installments<strong className="count-badge">{count}</strong>
              </span>
              <input
                aria-label="Remaining installment count"
                className="range-input"
                type="range"
                min={1}
                max={24}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
              />
              <span className="range-labels">
                <span>1 installment</span>
                <span>24 installments</span>
              </span>
            </label>
            <div className="form-grid">
              <label>
                Payment interval
                <select value={interval} onChange={(e) => setInterval(e.target.value as Interval)}>
                  <option value="monthly">Monthly</option>
                  <option value="biweekly">Every 2 weeks</option>
                  <option value="weekly">Weekly</option>
                </select>
              </label>
              <label>
                Proposed start
                <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              </label>
            </div>
            <hr />
            <h3>Your monthly budget estimates</h3>
            <p className="muted small">
              Use income you expect to receive. These estimates stay private.
            </p>
            {[
              { title: 'Monthly household income', value: income, set: setIncome },
              { title: 'Essential expenses, excluding rent', value: expenses, set: setExpenses },
              { title: 'Ongoing monthly rent', value: rent, set: setRent },
            ].map((f) => (
              <label key={f.title}>
                {f.title}
                <span className="currency-input">
                  <span>$</span>
                  <input
                    aria-label={f.title}
                    type="number"
                    min={0}
                    step="0.01"
                    value={f.value}
                    onChange={(e) => f.set(e.target.value)}
                  />
                </span>
              </label>
            ))}
          </div>
        </section>
        <div className="planner-results">
          {error ? (
            <Notice tone="error">{error}</Notice>
          ) : (
            <>
              <section className="repayment-highlight">
                <div>
                  <p className="eyebrow">YOUR PROPOSED INSTALLMENTS</p>
                  <h2>
                    {money(rows.find((r) => r.label.startsWith('Installment'))?.amount_cents ?? 0)}
                    <span>
                      {' '}
                      /{' '}
                      {interval === 'monthly'
                        ? 'month'
                        : interval === 'weekly'
                          ? 'week'
                          : '2 weeks'}
                    </span>
                  </h2>
                  <p>
                    {money(terms?.initial_cents ?? 0)} initially, then {count} installments · exact
                    rounding shown below
                  </p>
                </div>
                <span className="repayment-icon">
                  <TrendingDown size={34} />
                </span>
              </section>
              <section className="panel chart-panel">
                <div className="section-title">
                  <h2>See the balance over time</h2>
                  <span className="pill soft-green">Your scenario</span>
                </div>
                <BalanceChart rows={rows} total={terms?.total_cents ?? 0} />
              </section>
              <div className="budget-comparison">
                <div>
                  <small>Available after rent & essentials</small>
                  <strong>{money(available)}</strong>
                  <span>per month, based on your estimates</span>
                </div>
                <div>
                  <small>Highest repayment month</small>
                  <strong>{money(peak)}</strong>
                  <span>includes the initial payment</span>
                </div>
                <div>
                  <small>Estimated funds in that month</small>
                  <strong className={available - peak < 0 ? 'text-error' : 'text-teal'}>
                    {money(available - peak)}
                  </strong>
                  <span>before any other unlisted costs</span>
                </div>
              </div>
              {available < peak ? (
                <Notice tone="warning">
                  The proposed payments exceed your estimated available amount in at least one
                  calendar month. Consider changing the scenario or talking with a qualified housing
                  counselor.
                </Notice>
              ) : (
                <Notice>
                  Your estimates leave {money(available - peak)} in the highest-payment month. This
                  arithmetic does not establish that a plan is affordable, safe, or legally
                  appropriate.
                </Notice>
              )}
              <section className="panel scenarios">
                <h2>Compare a few possibilities</h2>
                <p className="muted small">
                  Shorter schedules have larger payments. Longer schedules spread payments over more
                  time.
                </p>
                <div className="scenario-grid">
                  {[
                    { label: 'Shorter', n: Math.max(1, count - 2) },
                    { label: 'Current', n: count },
                    { label: 'Longer', n: Math.min(120, count + 3) },
                  ].map((s, i) => {
                    const amount = terms
                      ? Math.ceil((terms.total_cents - terms.initial_cents) / s.n)
                      : 0;
                    return (
                      <button
                        key={i}
                        className={'scenario ' + (i === 1 ? 'selected' : '')}
                        onClick={() => setCount(s.n)}
                      >
                        <span>
                          {s.label}
                          {i === 1 && <Check size={13} />}
                        </span>
                        <strong>{money(amount)}</strong>
                        <small>{s.n} installments · approximately</small>
                      </button>
                    );
                  })}
                </div>
              </section>
              <section className="panel schedule-panel">
                <div className="section-title">
                  <h2>Your payment schedule</h2>
                  <button className="text-link" onClick={csv}>
                    <Download size={14} />
                    CSV
                  </button>
                </div>
                {rows.length ? (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Payment</th>
                          <th>Proposed date</th>
                          <th>Amount</th>
                          <th>Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => (
                          <tr key={i}>
                            <td>{r.label}</td>
                            <td>{formatDate(r.date)}</td>
                            <td>{money(r.amount_cents)}</td>
                            <td>{money(r.balance_cents)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={2}>Total proposed payments</td>
                          <td>{money(rows.reduce((s, r) => s + r.amount_cents, 0))}</td>
                          <td>{money(0)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <Empty title="No balance to schedule">
                    Your entered balance is zero. No payments are needed for this calculation.
                  </Empty>
                )}
              </section>
              {['tenant', 'landlord'].includes(state.profile.role) && (
                <section className="panel detail-panel">
                  <h2>Ready for a conversation?</h2>
                  <p>
                    This remains a private scenario until you explicitly share it to an accepted
                    discussion.
                  </p>
                  <label>
                    Choose an existing discussion
                    <select value={caseId} onChange={(e) => setCaseId(e.target.value)}>
                      <option value="">Select a discussion</option>
                      {cases.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                    />
                    <span>
                      I choose to share this schedule with the accepted participants in this
                      discussion. My budget estimates will stay private.
                    </span>
                  </label>
                  <button
                    disabled={busy || !caseId || !consent || !rows.length}
                    className="btn primary"
                    onClick={() => terms && run('propose', { case_id: caseId, terms })}
                  >
                    Share proposal to discussion
                    <ArrowRight size={16} />
                  </button>
                </section>
              )}
            </>
          )}
          <div className="disclaimer-inline">
            <ShieldCheck size={17} />
            <p>
              Educational planning only. No money is moved. A proposal is not a binding agreement,
              does not pause an eviction, and does not extend a court deadline. Get qualified legal
              advice before relying on terms.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
