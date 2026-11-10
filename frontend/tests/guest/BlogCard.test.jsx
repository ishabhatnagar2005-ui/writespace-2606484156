/** Verify bounded safe text, dates, links, and the source-specific border sequence. */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BlogCard } from '../../src/components/BlogCard.jsx';

const post = { id: 'note', title: 'A local note', content: 'a'.repeat(121), createdAt: '2026-11-10T07:30:00.000Z', authorName: 'Reader', authorId: 'reader' };

describe('BlogCard', () => {
  it('shows precisely 120 characters, date, author, and reader links', () => {
    render(<MemoryRouter><BlogCard post={post} /></MemoryRouter>);
    expect(screen.getByText('a'.repeat(120))).toBeInTheDocument();
    expect(screen.queryByText('a'.repeat(121))).not.toBeInTheDocument();
    expect(screen.getByText('Nov 10, 2026')).toHaveAttribute('dateTime', post.createdAt);
    expect(screen.getByText('Reader')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Read A local note' })).toHaveAttribute('href', '/blog/note');
  });
  it.each([[0, 'indigo'], [1, 'violet'], [2, 'pink'], [3, 'teal'], [4, 'indigo']])('uses border %s in sequence', (index, color) => {
    render(<MemoryRouter><BlogCard post={post} index={index} /></MemoryRouter>);
    expect(screen.getByRole('article')).toHaveClass(`border-t-card-${color}`);
  });
  it('renders short and empty content without adding ellipses or markup', () => {
    const { rerender } = render(
      <MemoryRouter><BlogCard post={{ ...post, title: '<b>Title</b>', content: '<script>unsafe()</script>' }} /></MemoryRouter>,
    );
    expect(screen.getByText('<script>unsafe()</script>')).toBeInTheDocument();
    expect(screen.getByRole('article').querySelector('script')).toBeNull();
    rerender(<MemoryRouter><BlogCard post={{ ...post, content: '' }} /></MemoryRouter>);
    expect(screen.getByRole('article')).toBeInTheDocument();
  });
  it('uses a readable fallback for an invalid date and encodes the destination', () => {
    render(<MemoryRouter><BlogCard post={{ ...post, id: 'a/b', createdAt: 'invalid' }} /></MemoryRouter>);
    expect(screen.getByText('Date unavailable')).not.toHaveAttribute('dateTime');
    expect(screen.getByRole('link', { name: 'Read A local note' })).toHaveAttribute('href', '/blog/a%2Fb');
  });
});
