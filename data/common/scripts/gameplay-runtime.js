/**
 * gameplay-runtime.js
 * Shared helpers for discovering gameplay context, compacting queued actions,
 * and hydrating readable labels for Session View / Dungeon Master surfaces.
 */

const GameplayRuntime = (() => {
  const ACTIVE_STATUSES = new Set(["active", "open", "pending"]);

  function characterKey(character = {}) {
    return String(character?.id || "").trim();
  }

  function actorIdFromRef(ref = {}) {
    return String(ref?.id || "").trim();
  }

  function normalizeIdList(values = []) {
    return Array.from(new Set((Array.isArray(values) ? values : [values])
      .map(value => String(value || "").trim())
      .filter(Boolean)));
  }

  function compactAction(action = {}) {
    const actorId = String(action.actorId || action.actor?.id || "").trim();
    const requestedById = String(action.requestedById || action.requestedBy || actorId).trim();
    const targetIds = normalizeIdList(action.targetIds || (action.targets || []).map(target => target?.id));
    const roll = action.roll ? {
      id: action.roll.id || Schema.generateId(),
      kind: action.roll.kind || "check",
      formula: action.roll.formula || "",
      ability: action.roll.ability || "",
      skill: action.roll.skill || "",
      dc: Number.isFinite(Number(action.roll.dc)) ? Number(action.roll.dc) : null,
      advantage: action.roll.advantage || "normal",
      modifiers: Array.isArray(action.roll.modifiers) ? action.roll.modifiers.map((modifier) => ({
        label: modifier.label || "",
        value: Number(modifier.value || 0) || 0,
        source: modifier.source || "",
      })) : [],
      visibility: action.roll.visibility || "public",
      requestedById,
      rolledById: action.roll.rolledById || action.roll.rolledBy || "",
      result: action.roll.result ? {
        raw: Number(action.roll.result.raw || 0) || 0,
        total: Number(action.roll.result.total || 0) || 0,
        outcome: action.roll.result.outcome || "",
        notes: action.roll.result.notes || "",
      } : null,
    } : null;

    const compactResolution = action.resolution ? {
      status: action.resolution.status || action.status || "",
      message: action.resolution.message || action.resolution.note || "",
      dmReply: action.resolution.dmReply || "",
      resolvedAt: action.resolution.resolvedAt || "",
      resolvedById: action.resolution.resolvedById || action.resolution.resolvedBy || "",
    } : null;

    return {
      id: action.id || Schema.generateId(),
      kind: action.kind || "utility",
      mode: action.mode || "session_utility",
      status: action.status || "queued",
      actorId,
      requestedById,
      targetIds,
      payload: action.payload && typeof action.payload === "object" ? JSON.parse(JSON.stringify(action.payload)) : {},
      roll,
      proposedDeltas: cloneDeltas(action.proposedDeltas || []),
      resultingDeltas: cloneDeltas(action.resultingDeltas || []),
      requestedAt: action.requestedAt || new Date().toISOString(),
      resolution: compactResolution,
      audit: action.audit && typeof action.audit === "object" ? JSON.parse(JSON.stringify(action.audit)) : {},
    };
  }

  function cloneDeltas(deltas = []) {
    return (Array.isArray(deltas) ? deltas : []).map((delta) => ({
      id: delta.id || Schema.generateId(),
      targetType: delta.targetType || "character",
      targetId: delta.targetId || "",
      path: delta.path || "",
      operation: delta.operation || "adjust",
      value: delta.value ?? 0,
      previousValue: delta.previousValue ?? null,
      nextValue: delta.nextValue ?? null,
      reason: delta.reason || "",
      source: delta.source || "",
    }));
  }

  function allCollections(name) {
    try {
      return typeof Library !== "undefined" ? Library.list(name) : [];
    } catch {
      return [];
    }
  }

  function findPartyForCharacter(character = {}) {
    const charId = characterKey(character);
    return allCollections("parties").find((party) =>
      (party.members || []).some((member) => actorMatchesCharacter(member.actor || member, character, charId))
    ) || null;
  }

  function actorMatchesCharacter(actor = {}, character = {}, charId = characterKey(character)) {
    return [
      actor?.id,
      actor?.characterId,
      actor?.characterPath,
    ].filter(Boolean).some((value) => value === charId || value === character.meta?.repoPath);
  }

  function findSessionsForCharacter(character = {}, party = null) {
    const charId = characterKey(character);
    const partyId = party?.id || findPartyForCharacter(character)?.id || "";
    return allCollections("sessions").filter((session) => {
      if (partyId && session.partyRef === partyId) return true;
      return sessionContainsActor(session, charId);
    });
  }

  function findEncountersForCharacter(character = {}, party = null) {
    const charId = characterKey(character);
    const partyId = party?.id || findPartyForCharacter(character)?.id || "";
    return allCollections("encounters").filter((encounter) => {
      if (partyId && encounter.partyRef === partyId && encounterContainsActor(encounter, charId)) return true;
      return encounterContainsActor(encounter, charId);
    });
  }

  function sessionContainsActor(session = {}, actorId = "") {
    return [
      ...(session.queuedActions || []),
      ...(session.actionLog || []),
    ].some((action) => action.actorId === actorId || action.requestedById === actorId || (action.targetIds || []).includes(actorId));
  }

  function encounterContainsActor(encounter = {}, actorId = "") {
    return (encounter.participants || []).some((participant) => String(participant?.id || "").trim() === actorId)
      || (encounter.initiative || []).some((entry) => String(entry?.actorId || "").trim() === actorId)
      || [
        ...(encounter.queuedActions || []),
        ...(encounter.actionLog || []),
      ].some((action) => action.actorId === actorId || action.requestedById === actorId || (action.targetIds || []).includes(actorId));
  }

  function isActiveStatus(status = "") {
    return ACTIVE_STATUSES.has(String(status || "").trim().toLowerCase());
  }

  function findActiveContext(character = {}) {
    const party = findPartyForCharacter(character);
    const sessions = findSessionsForCharacter(character, party);
    const activeSession = sessions.find((session) => isActiveStatus(session.status)) || sessions[0] || null;
    const encounters = findEncountersForCharacter(character, party);
    const sessionEncounter = activeSession?.encounterRef
      ? encounters.find((encounter) => encounter.id === activeSession.encounterRef)
      : null;
    const activeEncounter = sessionEncounter
      || encounters.find((encounter) => isActiveStatus(encounter.status))
      || null;

    return {
      party,
      session: activeSession,
      encounter: activeEncounter,
    };
  }

  function participantDirectory(context = {}) {
    const entries = new Map();
    const push = (id, label) => {
      const cleanId = String(id || "").trim();
      if (!cleanId || entries.has(cleanId)) return;
      entries.set(cleanId, label || cleanId);
    };

    push(context.character?.id, context.character?.identity?.name);
    (context.party?.members || []).forEach((member) => push(member.actor?.id, member.actor?.label || member.actor?.id));
    (context.encounter?.participants || []).forEach((participant) => push(participant.id, participant.label || participant.id));
    return entries;
  }

  function hydrateAction(action = {}, context = {}) {
    const compact = compactAction(action);
    const directory = participantDirectory(context);
    return {
      ...compact,
      actorLabel: directory.get(compact.actorId) || compact.actorId || "Unknown Actor",
      requestedByLabel: directory.get(compact.requestedById) || compact.requestedById || "",
      targetLabels: (compact.targetIds || []).map((id) => directory.get(id) || id),
      statusTone: statusTone(compact.status),
      resolutionText: compact.resolution?.dmReply || compact.resolution?.message || "",
    };
  }

  function actionsForActor(actions = [], actorId = "") {
    const cleanId = String(actorId || "").trim();
    return (Array.isArray(actions) ? actions : []).filter((action) => {
      const compact = compactAction(action);
      return compact.actorId === cleanId
        || compact.requestedById === cleanId
        || (compact.targetIds || []).includes(cleanId);
    });
  }

  function queueAction(record, collection, action) {
    const compact = compactAction(action);
    if (!record?.features) record.features = {};
    const branch = collection === "encounters" ? "encounter" : "session";
    const branchState = record.features[branch] || {};
    branchState.queuedActions = Array.isArray(branchState.queuedActions) ? branchState.queuedActions : [];
    branchState.queuedActions.push(compact);
    record.features[branch] = branchState;
    return compact;
  }

  function appendActionLog(record, collection, action) {
    const compact = compactAction(action);
    if (!record?.features) record.features = {};
    const branch = collection === "encounters" ? "encounter" : "session";
    const branchState = record.features[branch] || {};
    branchState.actionLog = Array.isArray(branchState.actionLog) ? branchState.actionLog : [];
    branchState.actionLog.push(compact);
    record.features[branch] = branchState;
    return compact;
  }

  function statusTone(status = "") {
    const clean = String(status || "").trim().toLowerCase();
    if (["approved", "applied"].includes(clean)) return "positive";
    if (["denied", "canceled", "rejected"].includes(clean)) return "negative";
    if (["queued", "pending"].includes(clean)) return "neutral";
    return "neutral";
  }

  return {
    characterKey,
    compactAction,
    cloneDeltas,
    findPartyForCharacter,
    findSessionsForCharacter,
    findEncountersForCharacter,
    findActiveContext,
    hydrateAction,
    actionsForActor,
    queueAction,
    appendActionLog,
    statusTone,
  };
})();

if (typeof globalThis !== "undefined") globalThis.GameplayRuntime = GameplayRuntime;
