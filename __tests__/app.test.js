const {
  sanitizePayload,
  mergeWithLocalEvents,
  upsertLocalEvent,
  formatStatus,
  addOrganizerNotification,
  state,
  LOCAL_EVENTS_KEY,
  FALLBACK_EVENTS,
} = require('../assets/js/app');

describe('app utilities', () => {
  beforeEach(() => {
    localStorage.clear();
    state.notifications = [];
  });

  test('sanitizePayload removes empty-like values while keeping meaningful data', () => {
    const payload = {
      title: 'Test',
      description: '   ',
      price: 0,
      undefinedField: undefined,
      nullField: null,
    };

    const cleaned = sanitizePayload(payload);
    expect(cleaned).toEqual({ title: 'Test', price: 0 });
  });

  test('mergeWithLocalEvents prefers locally stored updates', () => {
    const localOverride = { ...FALLBACK_EVENTS[0], status: 'rejected', title: 'Updated locally' };
    localStorage.setItem(LOCAL_EVENTS_KEY, JSON.stringify([localOverride]));

    const merged = mergeWithLocalEvents([FALLBACK_EVENTS[0]]);
    expect(merged).toContainEqual(expect.objectContaining({ id: FALLBACK_EVENTS[0].id, status: 'rejected', title: 'Updated locally' }));
  });

  test('upsertLocalEvent updates existing entries without duplication', () => {
    const initial = { id: 99, title: 'Initial', status: 'pending' };
    localStorage.setItem(LOCAL_EVENTS_KEY, JSON.stringify([initial]));

    const updated = { id: '99', status: 'approved' };
    const result = upsertLocalEvent(updated);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 99, title: 'Initial', status: 'approved' });
    expect(JSON.parse(localStorage.getItem(LOCAL_EVENTS_KEY))).toHaveLength(1);
  });

  test('formatStatus maps known statuses to human-friendly labels', () => {
    expect(formatStatus('pending')).toBe('Laukiama');
    expect(formatStatus('approved')).toBe('Patvirtinta');
    expect(formatStatus('unknown')).toBe('unknown');
    expect(formatStatus('')).toBe('—');
  });

  test('addOrganizerNotification prepends a contextual message', () => {
    const event = { title: 'Sample Event' };
    addOrganizerNotification(event, 'rejected', 'Reason text');

    expect(state.notifications[0]).toMatchObject({
      type: 'organizer',
      message: expect.stringContaining('Reason text'),
    });
  });
});
