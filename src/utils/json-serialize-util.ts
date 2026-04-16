type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
interface JsonObject { [key: string]: JsonValue }
interface JsonArray extends Array<JsonValue> {}

/**
 * 深度转换对象中的 Date 为标记对象
 */
function convertDatesToMarkers(obj: unknown): JsonValue {
  if (obj instanceof Date) {
    return { __type__: 'Date', __value__: obj.toISOString() };
  }
  if (Array.isArray(obj)) {
    return obj.map(convertDatesToMarkers);
  }
  if (obj !== null && typeof obj === 'object') {
    const result: JsonObject = {};
    for (const [key, val] of Object.entries(obj)) {
      result[key] = convertDatesToMarkers(val);
    }
    return result;
  }
  return obj as JsonValue;
}

// src/utils/serializer.ts
export const serializer = {
  serialize: (value: unknown): string => {
    // 先深度转换 Date 对象为标记对象
    const converted = convertDatesToMarkers(value);
    return JSON.stringify(converted);
  },
  parse: (value: string): unknown => {
    return JSON.parse(value, (_, val) => {
      // 识别标记并还原 Date 对象
      if (val && typeof val === 'object' && val.__type__ === 'Date' && val.__value__) {
        return new Date(val.__value__);
      }
      return val;
    });
  }
};
