import { describe, it, expect, vi } from 'vitest';
import { requireRole } from '../server/middleware/role.js';

function mockReq(role?: string) {
  return { user: role ? { id: 'usr_1', role } : undefined } as any;
}

function mockRes() {
  const res: any = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
}

describe('requireRole middleware', () => {
  it('allows user with matching role', () => {
    const middleware = requireRole('teacher', 'school');
    const next = vi.fn();
    const req = mockReq('teacher');
    const res = mockRes();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('allows school role when teacher is required', () => {
    const middleware = requireRole('teacher', 'school');
    const next = vi.fn();
    middleware(mockReq('school'), mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('rejects student from teacher-only route', () => {
    const middleware = requireRole('teacher', 'school');
    const next = vi.fn();
    const res = mockRes();

    middleware(mockReq('student'), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Insufficient permissions' })
    );
  });

  it('rejects unauthenticated user', () => {
    const middleware = requireRole('teacher');
    const next = vi.fn();
    const res = mockRes();

    middleware(mockReq(undefined), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('rejects teacher from school-only route', () => {
    const middleware = requireRole('school');
    const next = vi.fn();
    const res = mockRes();

    middleware(mockReq('teacher'), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
