import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { UserRow } from '../../src/components/UserRow.jsx';

const account = { id: 'one', username: 'reader', displayName: '<script>Reader</script>', role: 'user', password: 'secret-value' };
describe('UserRow', () => {
  it('shows safe identity, never a password, and deletes only on activation', async () => {
    const onDelete = vi.fn();
    const { container } = render(<ul><UserRow user={account} onDelete={onDelete} /></ul>);
    expect(screen.getByText(account.displayName)).toBeInTheDocument();
    expect(screen.getByText('User')).toBeInTheDocument();
    expect(container.querySelector('script')).toBeNull();
    expect(screen.queryByText(account.password)).not.toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Delete account reader' }));
    expect(onDelete).toHaveBeenCalledWith('one');
  });
  it.each([
    { user: { ...account, id: 'admin', role: 'admin' } },
    { user: { ...account, username: 'admin' } },
    { user: account, currentUserId: 'one' },
    { user: account, permanent: true },
  ])('disables permanent/current controls and rejects activation: %o', async (props) => {
    const onDelete = vi.fn();
    render(<ul><UserRow {...props} onDelete={onDelete} /></ul>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    await userEvent.setup().click(button);
    expect(onDelete).not.toHaveBeenCalled();
  });
});
