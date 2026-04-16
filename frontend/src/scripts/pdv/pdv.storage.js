import { getStorageItem, removeStorageItem, setStorageItem } from "../../utils/storage.js";
import { PDV_STORAGE_PREFIX } from "./pdv.constants.js";

function getStorageKey(userId) {
  return `${PDV_STORAGE_PREFIX}:${userId || "anonymous"}`;
}

export function getPdvDraftReference(userId) {
  return getStorageItem(getStorageKey(userId));
}

export function savePdvDraftReference(userId, saleId) {
  if (!userId || !saleId) {
    return;
  }

  setStorageItem(getStorageKey(userId), {
    saleId: Number(saleId),
    updatedAt: new Date().toISOString(),
  });
}

export function clearPdvDraftReference(userId) {
  if (!userId) {
    return;
  }

  removeStorageItem(getStorageKey(userId));
}
