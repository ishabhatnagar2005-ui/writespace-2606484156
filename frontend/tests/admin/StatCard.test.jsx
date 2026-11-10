import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatCard } from '../../src/components/StatCard.jsx';

describe('StatCard', () => {
  it.each([0, 1, 100000])('renders %s as a passive metric', (value) => {
    render(
      <dl>
        <StatCard label="Total posts" value={value} />
      </dl>,
    );
    expect(screen.getByText('Total posts')).toBeInTheDocument();
    expect(screen.getByText(String(value))).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
