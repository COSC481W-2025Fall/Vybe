// lib/groupsRepo.memory.js
// In-memory “fake DB”
const groups = new Map();
const members = new Map();

// ✅ seed your known test group so persisted can be true
groups.set('11111111-1111-1111-1111-111111111111', {
  id: '11111111-1111-1111-1111-111111111111',
});

export const memoryRepo = {
  async setJoinCode(groupId, code, expiresAt) {
    const g = groups.get(groupId);
    if (!g) return false;
    g.join_code = code;
    g.join_code_expires_at = expiresAt;
    groups.set(groupId, g);
    return true;
  },
  async findGroupByCode(code) {
    for (const g of groups.values()) {
      if (g.join_code === code) return g;
    }
    return null;
  },
  async addMember(groupId, userId) {
    if (!groups.has(groupId)) return false;
    if (!members.has(groupId)) members.set(groupId, new Set());
    members.get(groupId).add(userId);
    return true;
  }
};
