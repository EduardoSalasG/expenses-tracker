import { focusPublicMainContent } from './public-skip-focus';

describe('focusPublicMainContent', () => {
  it('keeps a public skip link on its anchor and moves keyboard focus to main content', () => {
    const target = document.createElement('main');
    target.tabIndex = -1;
    document.body.appendChild(target);
    const event = new MouseEvent('click', { cancelable: true });
    const focus = spyOn(target, 'focus').and.callThrough();

    focusPublicMainContent(event, target);

    expect(event.defaultPrevented).toBeTrue();
    expect(focus).toHaveBeenCalled();
    expect(document.activeElement).toBe(target);
    target.remove();
  });
});
