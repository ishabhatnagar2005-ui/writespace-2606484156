/** Exercise public links, passive rendering, and mobile toggle behavior. */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { PublicNavbar } from '../../src/components/PublicNavbar.jsx';

/** Expose navigation outcome without inspecting router internals. */
function Location() {
  return <p role="status">{useLocation().pathname}</p>;
}

describe('PublicNavbar', () => {
  it('keeps rendering passive and exposes labeled public entry links', async () => {
    localStorage.setItem('writespace_posts', '[{"id":"keep"}]');
    render(<MemoryRouter><PublicNavbar /><Location /></MemoryRouter>);
    expect(screen.getByRole('status')).toHaveTextContent('/');
    expect(localStorage.getItem('writespace_posts')).toBe('[{"id":"keep"}]');
    expect(screen.getByRole('link', { name: 'WriteSpace home' })).toHaveAttribute('href', '/');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Open navigation' }));
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Get started' })).toHaveAttribute('href', '/register');
  });
  it('opens and closes mobile navigation only after activation', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><PublicNavbar /></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'Open navigation' })).toHaveAttribute('aria-expanded', 'false');
    await user.click(screen.getByRole('button', { name: 'Open navigation' }));
    expect(screen.getByRole('navigation')).not.toHaveClass('hidden');
    await user.click(screen.getByRole('button', { name: 'Close navigation' }));
    expect(screen.getByRole('button', { name: 'Open navigation' })).toHaveAttribute('aria-expanded', 'false');
  });
  it('navigates on link click and resets the expanded menu', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><PublicNavbar /><Location /></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: 'Open navigation' }));
    await user.click(screen.getByRole('link', { name: 'Log in' }));
    expect(screen.getByRole('status')).toHaveTextContent('/login');
    expect(screen.getByRole('button', { name: 'Open navigation' })).toHaveAttribute('aria-expanded', 'false');
  });
});
