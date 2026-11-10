/** Verify role identity marks and the public avatar helper. */
import { describe, expect, it, vi } from 'vitest';
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
  it('renders a labeled medium avatar without crashing for an unsupported size', () => {
    const originalError = console.error;
    const expectedWarning = 'Invalid prop `size` of value `unsupported` supplied to `Avatar`';
    const diagnostics = [];
    const errorSpy = vi.spyOn(console, 'error').mockImplementation((...args) => {
      if (args.join(' ').includes(expectedWarning)) {
        diagnostics.push(args);
      } else {
        originalError(...args);
      }
    });
    try {
      expect(() => render(<Avatar size="unsupported" />)).not.toThrow();
      expect(screen.getByRole('img', { name: 'User avatar' })).toHaveClass('h-10', 'w-10');
      expect(diagnostics).toHaveLength(1);
    } finally {
      errorSpy.mockRestore();
    }
  });
  it.each([['sm', 'h-8'], ['md', 'h-10'], ['lg', 'h-12']])('uses the shared %s size', (size, height) => {
    render(<Avatar size={size} />);
    expect(screen.getByRole('img')).toHaveClass(height);
  });
});
