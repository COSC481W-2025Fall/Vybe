import { NextResponse } from 'next/server';
import { genCode } from '../../../../lib/joinCodes.js';
import { groupsRepo } from '../../../../lib/groups.js';

export async function POST(_req, context) {
  const { id } = context.params || {};
  if (!id) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const joinCode = genCode(4);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const ok = await groupsRepo.setJoinCode(id, joinCode, expiresAt);

  return NextResponse.json(
    { groupId: id, joinCode, persisted: ok, expiresAt },
    { status: ok ? 200 : 404 }
  );
}
