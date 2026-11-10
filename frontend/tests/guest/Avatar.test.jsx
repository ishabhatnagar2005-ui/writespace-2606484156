/** Verify role identity marks and the public avatar helper. */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Avatar, getAvatar } from '../../src/components/Avatar.jsx';

describe('Avatar', () => {
  it('renders a labeled indigo book for the ordinary user', () => {
    render(<Avatar role="user" />);
    expect(screen.getByRole('img', { name: 'User avatar' })).toHaveClass('text-avatar-user');
    expect(screen.getByRole('img').querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
  it('returns a labeled violet crown from getAvatar for Admin', () => {
    render(getAvatar('admin'));
    expect(screen.getByRole('img', { name: 'Admin avatar' })).toHaveClass('text-avatar-admin');
  });
  it('falls back to the book for unknown and omitted roles', () => {
    const { rerender } = render(getAvatar('unknown'));
    expect(screen.getByRole('img', { name: 'User avatar' })).toBeInTheDocument();
    rerender(<Avatar />);
    expect(screen.getByRole('img', { name: 'User avatar' })).toHaveClass('h-10');
  });
  it.each([['sm', 'h-8'], ['md', 'h-10'], ['lg', 'h-12']])('uses the shared %s size', (size, height) => {
    render(<Avatar size={size} />);
    expect(screen.getByRole('img')).toHaveClass(height);
  });
});
