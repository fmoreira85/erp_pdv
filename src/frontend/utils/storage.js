export function getStorageItem(key) {
  try {
    const rawValue = window.localStorage.getItem(key);
    return rawValue ? JSON.parse(rawValue) : null;
  } catch (error) {
    return null;
  }
}

export function setStorageItem(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error("Nao foi possivel salvar item no localStorage.", error);
  }
}

export function removeStorageItem(key) {
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.error("Nao foi possivel remover item do localStorage.", error);
  }
}
