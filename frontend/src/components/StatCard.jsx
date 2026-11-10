/** Present a quiet, non-interactive local metric. */
import PropTypes from 'prop-types';

/** Render a label and count without attaching actions.
 * Args:
 *   label: Unique metric meaning.
 *   value: Numeric count, including zero.
 * Returns:
 *   A flat metric card.
 */
export function StatCard({ label, value }) {
  return (
    <div className="rounded border border-border bg-surface p-6">
      <dt className="text-sm text-foreground-muted">{label}</dt>
      <dd className="mt-3 font-mono text-3xl tabular-nums">{value}</dd>
    </div>
  );
}
StatCard.propTypes = { label: PropTypes.string.isRequired, value: PropTypes.number.isRequired };
