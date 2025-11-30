export const RESOURCE_TYPES = Object.freeze([
  { value: 'file', label: 'Downloadable file' },
  { value: 'link', label: 'External link' },
  { value: 'flipsnack', label: 'Flipsnack embed' },
]);

export const RESOURCE_TYPE_VALUES = RESOURCE_TYPES.map((entry) => entry.value);

export const RESOURCE_TYPE_SET = new Set(RESOURCE_TYPE_VALUES);

export const MAX_RESOURCE_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB hard cap for uploads
